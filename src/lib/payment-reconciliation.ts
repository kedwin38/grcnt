// Shared "what is this pending M-Pesa payment's real status" logic, used by
// both the interactive status-poll endpoint (while a customer is watching
// the checkout page) and the background sweep in instrumentation-node.ts
// (so a payment still gets resolved even if the customer closes the tab).
//
// A payment must always end up COMPLETED (SUCCESS), CANCELLED, or FAILED —
// never left PENDING indefinitely. The STK Push Query API never returns the
// M-Pesa receipt number (only the callback payload does), so a payment
// resolved here as SUCCESS is finalised without a receipt; if Daraja's
// callback arrives afterwards, src/app/api/mpesa/callback/route.ts backfills
// the receipt onto the already-SUCCESS payment rather than ignoring it.
import { db } from "./db";
import { newOrderCode } from "./codes";
import { stkQuery, isSimulated, DARAJA_TERMINAL_FAILURE_CODES } from "./daraja";
import { getPaymentAccount } from "./payment-accounts";
import type { Payment, Prisma } from "@prisma/client";

// Beyond this age, an M-Pesa prompt has long since expired on the phone and
// Daraja will not usefully answer a query for it — resolve it as a timed
// out failure rather than polling forever.
const MAX_PENDING_AGE_MS = 30 * 60 * 1000;

export type ReconcileResult = {
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  receipt?: string | null;
  resultDesc?: string | null;
  orderStatus?: string;
};

async function decrementStock(tx: Prisma.TransactionClient, orderId: number) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: { product: { include: { category: true } } },
  });
  for (const item of items) {
    if (item.product && item.product.category.tracksStock && item.product.stock !== null) {
      await tx.product.update({ where: { id: item.product.id }, data: { stock: { decrement: item.qty } } });
    }
  }
}

async function finalizeSimulated(payment: Payment, orderId: number, fulfilment: string): Promise<ReconcileResult> {
  const receipt = `SIM${newOrderCode().slice(4, 10)}`;
  const autoCompleted = fulfilment === "INSTANT_TOPUP";
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "SUCCESS", mpesaReceipt: receipt, resultCode: "0", resultDesc: "Simulated success" },
    });
    if (updated.count === 0) return null;
    await tx.order.update({ where: { id: orderId }, data: { status: autoCompleted ? "COMPLETED" : "PAID" } });
    await decrementStock(tx, orderId);
    return receipt;
  });
  if (result === null) return { status: "PENDING" };
  return { status: "SUCCESS", receipt: result, orderStatus: autoCompleted ? "COMPLETED" : "PAID" };
}

/**
 * Resolves one PENDING payment's real status: queries Daraja (unless
 * simulated or already resolved), and — race-safely against the callback
 * arriving concurrently — finalises the payment/order/stock exactly once.
 * Safe to call repeatedly; a no-op once the payment is no longer PENDING.
 */
export async function reconcilePayment(paymentId: number): Promise<ReconcileResult> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });
  if (!payment) return { status: "PENDING" };
  if (payment.status !== "PENDING") {
    return { status: payment.status as ReconcileResult["status"], receipt: payment.mpesaReceipt, resultDesc: payment.resultDesc };
  }

  const ageMs = Date.now() - payment.createdAt.getTime();

  if (payment.simulated) {
    if (ageMs < 6000) return { status: "PENDING" };
    return finalizeSimulated(payment, payment.orderId, payment.order.fulfilment);
  }

  if (!payment.checkoutRequestId) return { status: "PENDING" };

  // Give Daraja's callback a head start before spending a query on it — most
  // payments resolve via the callback well within this window, so querying
  // immediately would just be redundant Daraja API traffic.
  if (ageMs < 12000) return { status: "PENDING" };

  let rc: string | undefined;
  let resultDesc: string | undefined;
  try {
    const account = await getPaymentAccount(payment.order.paymentAccountId);
    const result = await stkQuery(account, payment.checkoutRequestId);
    rc = String(result.ResultCode ?? result.ResponseCode ?? "");
    resultDesc = result.ResultDesc;
  } catch {
    // Query not answerable yet (or account temporarily misconfigured) —
    // fall through to the age check below rather than treating this as a
    // final outcome.
  }

  if (rc === "0") {
    const autoCompleted = payment.order.fulfilment === "INSTANT_TOPUP";
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "SUCCESS", resultCode: rc, resultDesc: resultDesc || "Success", mpesaReceipt: null },
      });
      if (updated.count === 0) return null;
      await tx.order.update({ where: { id: payment.orderId }, data: { status: autoCompleted ? "COMPLETED" : "PAID" } });
      await decrementStock(tx, payment.orderId);
      return true;
    });
    if (result === null) {
      // Callback (or another reconcile pass) beat us to it — reflect that.
      const fresh = await db.payment.findUnique({ where: { id: payment.id } });
      return { status: (fresh?.status as ReconcileResult["status"]) || "PENDING", receipt: fresh?.mpesaReceipt };
    }
    return { status: "SUCCESS", receipt: null, orderStatus: autoCompleted ? "COMPLETED" : "PAID" };
  }

  if (rc !== undefined && rc !== "" && DARAJA_TERMINAL_FAILURE_CODES.has(rc)) {
    const cancelled = rc === "1032";
    await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: cancelled ? "CANCELLED" : "FAILED", resultCode: rc, resultDesc },
    });
    return { status: cancelled ? "CANCELLED" : "FAILED", resultDesc };
  }

  // Still genuinely mid-flight (no query answer yet, or a non-terminal
  // code) — unless it's been so long the prompt itself must have expired,
  // in which case stop waiting and resolve it as a timeout rather than
  // leaving the order hanging in PENDING_PAYMENT forever.
  if (ageMs > MAX_PENDING_AGE_MS) {
    const timeoutDesc = "Payment timed out — no confirmation received from M-Pesa.";
    await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED", resultCode: "TIMEOUT", resultDesc: timeoutDesc },
    });
    return { status: "FAILED", resultDesc: timeoutDesc };
  }

  return { status: "PENDING" };
}

/**
 * Background sweep: finds every payment still PENDING and old enough that a
 * fresh STK push wouldn't just be racing its own first callback, and
 * resolves each one. Runs independently of any customer having the
 * checkout page open, so a payment is never left hanging just because the
 * browser was closed.
 */
export async function reconcileStalePayments(): Promise<void> {
  const cutoff = new Date(Date.now() - 15_000);
  const stale = await db.payment.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });
  for (const { id } of stale) {
    try {
      await reconcilePayment(id);
    } catch (err) {
      console.error(`payment reconciliation failed for payment ${id}:`, err);
    }
  }
}

export { isSimulated };
