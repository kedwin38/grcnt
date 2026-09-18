import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readJson } from "@/lib/api";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function extractMetadata(cb: Record<string, unknown>): Record<string, unknown> {
  return (
    (cb.CallbackMetadata as { Item?: { Name: string; Value?: unknown }[] } | undefined)?.Item || []
  ).reduce<Record<string, unknown>>((acc, item) => {
    if (item.Value !== undefined && item.Value !== null) acc[item.Name] = item.Value;
    return acc;
  }, {});
}

// Daraja STK Push callback (server-to-server). Always ACK with ResultCode 0
// once processed — Daraja retries on non-200 but never on business declines.
//
// This can race the background/interactive safety net in
// src/lib/payment-reconciliation.ts, which resolves a payment via STK Push
// Query (an API that never returns the M-Pesa receipt) if this callback is
// slow or never arrives. Every write below is guarded with an `updateMany`
// keyed on the payment still being PENDING, so whichever path gets there
// first "wins" the finalisation — and if the safety net already won,
// this callback still backfills the receipt onto that already-SUCCESS
// payment rather than discarding the one place the receipt comes from.
export async function POST(req: NextRequest) {
  const body = await readJson<Record<string, unknown>>(req);
  const ack = NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  if (!body || typeof body.Body !== "object" || body.Body === null) {
    console.warn("mpesa callback: malformed body");
    return ack;
  }

  const cb = (body.Body as { stkCallback?: Record<string, unknown> }).stkCallback;
  if (!cb) return ack;

  const checkoutRequestId = cb.CheckoutRequestID as string | undefined;
  const resultCode = String(cb.ResultCode ?? "");
  const resultDesc = (cb.ResultDesc as string) || "";

  if (!checkoutRequestId) return ack;

  const payment = await db.payment.findUnique({
    where: { checkoutRequestId },
    include: { order: { include: { items: { include: { product: { include: { category: true } } } } } } },
  });
  if (!payment) {
    console.warn(`mpesa callback: unknown CheckoutRequestID ${checkoutRequestId}`);
    return ack;
  }

  if (resultCode === "0") {
    const items = extractMetadata(cb);
    const amount = Number(items.Amount ?? payment.amount);
    const receipt = items.MpesaReceiptNumber ? String(items.MpesaReceiptNumber) : null;
    const txDate = items.TransactionDate ? String(items.TransactionDate) : null;
    const amountOk = amount === payment.order.total;

    const claimed = await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status: amountOk ? "SUCCESS" : "FAILED",
        resultCode,
        resultDesc: amountOk ? resultDesc : `Amount mismatch: paid ${amount}, expected ${payment.order.total}`,
        mpesaReceipt: receipt,
        transactionDate: txDate,
        rawCallback: JSON.stringify(body),
      },
    });

    if (claimed.count === 1) {
      if (amountOk) {
        const autoCompleted = payment.order.fulfilment === "INSTANT_TOPUP";
        await db.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: autoCompleted ? "COMPLETED" : "PAID" },
          });
          for (const item of payment.order.items) {
            if (item.product && item.product.category.tracksStock && item.product.stock !== null) {
              await tx.product.update({ where: { id: item.product.id }, data: { stock: { decrement: item.qty } } });
            }
          }
        });
        await audit(null, autoCompleted ? "payment.success_auto_completed" : "payment.success", "order", payment.order.code, {
          receipt,
          amount,
          phone: items.PhoneNumber,
        });
      } else {
        await audit(null, "payment.amount_mismatch", "order", payment.order.code, { paid: amount, expected: payment.order.total });
      }
      return ack;
    }

    // Already resolved by the safety net before this callback landed. If it
    // finalised as SUCCESS with no receipt (query alone can't provide one),
    // this callback is the only source for it — backfill just that field.
    const current = await db.payment.findUnique({ where: { id: payment.id } });
    if (current?.status === "SUCCESS" && !current.mpesaReceipt && receipt) {
      await db.payment.update({
        where: { id: payment.id },
        data: { mpesaReceipt: receipt, transactionDate: txDate, rawCallback: JSON.stringify(body) },
      });
      await audit(null, "payment.receipt_backfilled", "order", payment.order.code, { receipt });
    }
    return ack;
  }

  // Non-success outcome — only apply it if we still own a PENDING payment;
  // if the safety net already resolved this one (e.g. as a timeout), a late
  // disagreeing callback doesn't get to override that.
  const cancelled = resultCode === "1032";
  const claimed = await db.payment.updateMany({
    where: { id: payment.id, status: "PENDING" },
    data: { status: cancelled ? "CANCELLED" : "FAILED", resultCode, resultDesc, rawCallback: JSON.stringify(body) },
  });
  if (claimed.count === 1) {
    await audit(null, cancelled ? "payment.cancelled" : "payment.failed", "order", payment.order.code, { resultCode, resultDesc });
  }

  return ack;
}
