import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readJson } from "@/lib/api";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Daraja STK Push callback (server-to-server). Always ACK with ResultCode 0
// once processed — Daraja retries on non-200 but never on business declines.
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
  if (payment.status !== "PENDING") return ack; // idempotent — already finalised

  await db.$transaction(async (tx) => {
    if (resultCode === "0") {
      // Extract metadata items (Amount, MpesaReceiptNumber, TransactionDate, PhoneNumber)
      const items = (
        (cb.CallbackMetadata as { Item?: { Name: string; Value?: unknown }[] } | undefined)
          ?.Item || []
      ).reduce<Record<string, unknown>>((acc, item) => {
        if (item.Value !== undefined && item.Value !== null) acc[item.Name] = item.Value;
        return acc;
      }, {});

      const amount = Number(items.Amount ?? payment.amount);
      const receipt = items.MpesaReceiptNumber ? String(items.MpesaReceiptNumber) : null;
      const txDate = items.TransactionDate ? String(items.TransactionDate) : null;

      const amountOk = amount === payment.order.total;

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: amountOk ? "SUCCESS" : "FAILED",
          resultCode,
          resultDesc: amountOk ? resultDesc : `Amount mismatch: paid ${amount}, expected ${payment.order.total}`,
          mpesaReceipt: receipt,
          transactionDate: txDate,
          rawCallback: JSON.stringify(body),
        },
      });

      if (amountOk) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "PAID" },
        });
        for (const item of payment.order.items) {
          if (
            item.product &&
            item.product.category.tracksStock &&
            item.product.stock !== null
          ) {
            await tx.product.update({
              where: { id: item.product.id },
              data: { stock: { decrement: item.qty } },
            });
          }
        }
        await audit(null, "payment.success", "order", payment.order.code, {
          receipt,
          amount,
          phone: items.PhoneNumber,
        });
      } else {
        await audit(null, "payment.amount_mismatch", "order", payment.order.code, {
          paid: amount,
          expected: payment.order.total,
        });
      }
    } else {
      const cancelled = resultCode === "1032";
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: cancelled ? "CANCELLED" : "FAILED",
          resultCode,
          resultDesc,
          rawCallback: JSON.stringify(body),
        },
      });
      await audit(null, cancelled ? "payment.cancelled" : "payment.failed", "order", payment.order.code, {
        resultCode,
        resultDesc,
      });
    }
  });

  return ack;
}
