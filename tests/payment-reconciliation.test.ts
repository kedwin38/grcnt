import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { makePendingOrderWithPayment } from "./helpers";

vi.mock("@/lib/daraja", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/daraja")>();
  return { ...actual, stkQuery: vi.fn() };
});

import { stkQuery } from "@/lib/daraja";
import { reconcilePayment, reconcileStalePayments } from "@/lib/payment-reconciliation";

describe("reconcilePayment — never leaves a payment hanging forever", () => {
  beforeEach(() => {
    vi.mocked(stkQuery).mockReset();
  });

  it("finalises a payment as FAILED with a timeout reason once it's far too old to still be waiting", async () => {
    const { payment, order } = await makePendingOrderWithPayment({
      paymentCreatedAt: new Date(Date.now() - 31 * 60_000), // 31 minutes old
    });
    vi.mocked(stkQuery).mockRejectedValue(new Error("still processing"));

    const result = await reconcilePayment(payment.id);

    expect(result.status).toBe("FAILED");
    expect(result.resultDesc).toMatch(/timed out/i);
    const updated = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updated.status).toBe("FAILED");
    expect(updated.resultCode).toBe("TIMEOUT");
    const updatedOrder = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrder.status).toBe("PENDING_PAYMENT"); // never silently marked paid
  });

  it("does not touch a payment that's already been resolved (no duplicate Daraja query)", async () => {
    const { payment } = await makePendingOrderWithPayment();
    await db.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", mpesaReceipt: "ABC123" } });

    const result = await reconcilePayment(payment.id);

    expect(result.status).toBe("SUCCESS");
    expect(result.receipt).toBe("ABC123");
    expect(stkQuery).not.toHaveBeenCalled();
  });

});

describe("reconcileStalePayments — the background sweep", () => {
  beforeEach(() => {
    vi.mocked(stkQuery).mockReset();
  });

  it("resolves an old-enough PENDING payment and leaves a brand-new one alone", async () => {
    const { payment: oldPayment } = await makePendingOrderWithPayment({
      paymentCreatedAt: new Date(Date.now() - 20_000),
    });
    const { payment: freshPayment } = await makePendingOrderWithPayment({
      paymentCreatedAt: new Date(),
    });
    vi.mocked(stkQuery).mockResolvedValue({
      ResponseCode: "0",
      ResultCode: "1032",
      ResultDesc: "Request cancelled by user",
      CheckoutRequestID: "x",
    });

    await reconcileStalePayments();

    const updatedOld = await db.payment.findUniqueOrThrow({ where: { id: oldPayment.id } });
    const updatedFresh = await db.payment.findUniqueOrThrow({ where: { id: freshPayment.id } });
    expect(updatedOld.status).toBe("CANCELLED");
    expect(updatedFresh.status).toBe("PENDING"); // too fresh to have been queried yet
  });
});
