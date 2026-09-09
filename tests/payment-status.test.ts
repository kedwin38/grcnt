import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { makePendingOrderWithPayment } from "./helpers";

vi.mock("@/lib/session", () => ({
  apiUser: vi.fn(),
}));
vi.mock("@/lib/daraja", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/daraja")>();
  return { ...actual, stkQuery: vi.fn() };
});

import { apiUser } from "@/lib/session";
import { stkQuery } from "@/lib/daraja";
import { GET as paymentStatus } from "@/app/api/payments/status/[code]/route";

function statusRequest(code: string) {
  const req = new NextRequest(`http://localhost/api/payments/status/${code}`);
  return paymentStatus(req, { params: Promise.resolve({ code }) });
}

describe("GET /api/payments/status/[code] — never assumes, never drops tracking early", () => {
  beforeEach(() => {
    vi.mocked(stkQuery).mockReset();
  });

  it("stays PENDING and does not query Daraja before the grace window elapses", async () => {
    const { order, user } = await makePendingOrderWithPayment({ paymentCreatedAt: new Date() });
    vi.mocked(apiUser).mockResolvedValue(user as never);

    const res = await statusRequest(order.code);
    const body = await res.json();

    expect(body.data.status).toBe("PENDING");
    expect(stkQuery).not.toHaveBeenCalled();
  });

  it("resolves a simulated (demo mode) payment to SUCCESS after its delay, and decrements stock", async () => {
    const { order, user, product } = await makePendingOrderWithPayment({
      qty: 3,
      stock: 10,
      simulated: true,
      paymentCreatedAt: new Date(Date.now() - 10_000),
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);

    const res = await statusRequest(order.code);
    const body = await res.json();

    expect(body.data.status).toBe("SUCCESS");
    expect(body.data.orderStatus).toBe("PAID");
    const updatedProduct = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.stock).toBe(7); // 10 - qty(3)
    expect(stkQuery).not.toHaveBeenCalled(); // simulated path never touches Daraja
  });

  it("marks PAID and decrements stock when the fallback query confirms success", async () => {
    const { order, user, product } = await makePendingOrderWithPayment({
      qty: 1,
      stock: 5,
      paymentCreatedAt: new Date(Date.now() - 20_000),
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);
    vi.mocked(stkQuery).mockResolvedValue({
      ResponseCode: "0",
      ResultCode: "0",
      ResultDesc: "The service request is processed successfully.",
      CheckoutRequestID: "x",
    });

    const res = await statusRequest(order.code);
    const body = await res.json();

    expect(body.data.status).toBe("SUCCESS");
    expect(body.data.orderStatus).toBe("PAID");
    const updatedProduct = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.stock).toBe(4);
  });

  it("marks CANCELLED on a confirmed terminal cancellation code (1032)", async () => {
    const { order, user, payment } = await makePendingOrderWithPayment({
      paymentCreatedAt: new Date(Date.now() - 20_000),
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);
    vi.mocked(stkQuery).mockResolvedValue({
      ResponseCode: "0",
      ResultCode: "1032",
      ResultDesc: "Request cancelled by user",
      CheckoutRequestID: "x",
    });

    const res = await statusRequest(order.code);
    const body = await res.json();

    expect(body.data.status).toBe("CANCELLED");
    const updatedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe("CANCELLED");
  });

  it("REGRESSION: does not report FAILED for a non-terminal/unrecognised code (4999) — stays PENDING", async () => {
    // The exact code observed live: Daraja returned 4999 ("still under
    // processing") for a push that had genuinely arrived and was awaiting
    // PIN entry. This must never be reported to the customer as failed.
    const { order, user, payment } = await makePendingOrderWithPayment({
      paymentCreatedAt: new Date(Date.now() - 20_000),
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);
    vi.mocked(stkQuery).mockResolvedValue({
      ResponseCode: "0",
      ResultCode: "4999",
      ResultDesc: "The transaction is still under processing",
      CheckoutRequestID: "x",
    });

    const res = await statusRequest(order.code);
    const body = await res.json();

    expect(body.data.status).toBe("PENDING");
    const updatedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe("PENDING"); // not overwritten to FAILED
  });

  it("stays PENDING (not FAILED) when the query itself errors — e.g. Daraja's 'still processing' error shape", async () => {
    const { order, user, payment } = await makePendingOrderWithPayment({
      paymentCreatedAt: new Date(Date.now() - 20_000),
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);
    vi.mocked(stkQuery).mockRejectedValue(new Error("The transaction is being processed"));

    const res = await statusRequest(order.code);
    const body = await res.json();

    expect(body.data.status).toBe("PENDING");
    const updatedPayment = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe("PENDING");
  });

  it("is idempotent: once resolved via callback, polling again short-circuits without re-querying Daraja", async () => {
    const { order, user, payment } = await makePendingOrderWithPayment({
      paymentCreatedAt: new Date(Date.now() - 20_000),
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);
    // Simulate the callback having already finalised this payment.
    await db.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", mpesaReceipt: "ABC123" } });
    await db.order.update({ where: { id: order.id }, data: { status: "PAID" } });

    const res = await statusRequest(order.code);
    const body = await res.json();

    expect(body.data.status).toBe("SUCCESS");
    expect(body.data.receipt).toBe("ABC123");
    expect(stkQuery).not.toHaveBeenCalled();
  });

  it("scopes lookups to the requesting user — a stranger cannot see or affect another customer's order", async () => {
    const { order } = await makePendingOrderWithPayment();
    const stranger = await db.user.create({
      data: { name: "Stranger", phone: "254799999999", passwordHash: "x" },
    });
    vi.mocked(apiUser).mockResolvedValue(stranger as never);

    const res = await statusRequest(order.code);
    expect(res.status).toBe(404);
  });
});
