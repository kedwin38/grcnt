import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { POST as mpesaCallback } from "@/app/api/mpesa/callback/route";
import { makePendingOrderWithPayment } from "./helpers";

function callbackRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mpesa/callback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function successCallback(checkoutRequestId: string, amount: number, phone: string) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "m1",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amount },
            { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
            { Name: "TransactionDate", Value: 20260909182115 },
            { Name: "PhoneNumber", Value: Number(phone) },
          ],
        },
      },
    },
  };
}

function failureCallback(checkoutRequestId: string, resultCode: number, resultDesc: string) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "m1",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc: resultDesc,
      },
    },
  };
}

describe("POST /api/mpesa/callback — finalising a transaction", () => {
  it("auto-completes an instant top-up order (no admin step) and decrements stock on a genuine success callback", async () => {
    const { order, payment, product } = await makePendingOrderWithPayment({ qty: 2, stock: 10 });

    const res = await mpesaCallback(
      callbackRequest(successCallback(payment.checkoutRequestId!, payment.amount, payment.phone))
    );
    expect(res.status).toBe(200);

    const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    const updatedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const updatedProduct = await db.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(updatedOrder.status).toBe("COMPLETED");
    expect(updatedPayment.status).toBe("SUCCESS");
    expect(updatedPayment.mpesaReceipt).toBe("NLJ7RT61SV");
    expect(updatedProduct.stock).toBe(8); // 10 - qty(2)
  });

  it("only marks PAID (still needs staff action) for a non-instant fulfilment order", async () => {
    const { order, payment } = await makePendingOrderWithPayment({ fulfilment: "ROUTER_TOPUP" });

    const res = await mpesaCallback(
      callbackRequest(successCallback(payment.checkoutRequestId!, payment.amount, payment.phone))
    );
    expect(res.status).toBe(200);

    const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrder.status).toBe("PAID");
  });

  it("never marks the order paid on an amount mismatch, and never touches stock", async () => {
    const { order, payment, product } = await makePendingOrderWithPayment({ qty: 2, stock: 10 });

    // Customer's order totals 100 (2 x 50) — callback claims only 10 was paid.
    const res = await mpesaCallback(
      callbackRequest(successCallback(payment.checkoutRequestId!, 10, payment.phone))
    );
    expect(res.status).toBe(200);

    const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    const updatedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const updatedProduct = await db.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(updatedOrder.status).toBe("PENDING_PAYMENT");
    expect(updatedPayment.status).toBe("FAILED");
    expect(updatedPayment.resultDesc).toMatch(/mismatch/i);
    expect(updatedProduct.stock).toBe(10); // untouched
  });

  it("marks CANCELLED (not FAILED) when the customer cancels the prompt", async () => {
    const { order, payment } = await makePendingOrderWithPayment();

    const res = await mpesaCallback(
      callbackRequest(failureCallback(payment.checkoutRequestId!, 1032, "Request cancelled by user"))
    );
    expect(res.status).toBe(200);

    const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    const updatedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe("CANCELLED");
    expect(updatedOrder.status).toBe("PENDING_PAYMENT");
  });

  it("marks FAILED for a genuine non-cancellation failure", async () => {
    const { payment } = await makePendingOrderWithPayment();

    await mpesaCallback(
      callbackRequest(failureCallback(payment.checkoutRequestId!, 1, "Insufficient balance"))
    );

    const updatedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe("FAILED");
  });

  it("safely ignores a callback for an unknown CheckoutRequestID instead of crashing", async () => {
    const res = await mpesaCallback(
      callbackRequest(successCallback("ws_CO_does_not_exist", 100, "254700000000"))
    );
    // Daraja always gets ACK'd — retrying a callback we can't match must
    // never surface as an error to Safaricom.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ResultCode).toBe(0);
  });

  it("is idempotent: a repeated callback after the payment is already resolved changes nothing", async () => {
    const { order, payment, product } = await makePendingOrderWithPayment({ qty: 2, stock: 10 });

    await mpesaCallback(
      callbackRequest(successCallback(payment.checkoutRequestId!, payment.amount, payment.phone))
    );
    // Safaricom is documented to retry callbacks on non-200 responses; a
    // duplicate delivery of the SAME final result must never double-process.
    await mpesaCallback(
      callbackRequest(successCallback(payment.checkoutRequestId!, payment.amount, payment.phone))
    );

    const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    const updatedProduct = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedOrder.status).toBe("COMPLETED");
    expect(updatedProduct.stock).toBe(8); // decremented once, not twice
  });
});
