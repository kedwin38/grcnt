import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { setDefaultPaymentAccount } from "@/lib/payment-accounts";
import { makeTestPaymentAccount } from "./helpers";

vi.mock("@/lib/session", () => ({ apiUser: vi.fn() }));
import { apiUser } from "@/lib/session";
import { POST as createOrder } from "@/app/api/orders/route";

const CSRF_TOKEN = "test-csrf-token";

function orderRequest(body: unknown) {
  const req = new NextRequest("http://localhost/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-csrf-token": CSRF_TOKEN,
      cookie: `gcn_csrf=${CSRF_TOKEN}`,
    },
  });
  return createOrder(req);
}

async function makeInstantProduct(paymentAccountId: number | null) {
  const category = await db.category.create({
    data: {
      name: "Test Airtime",
      slug: `test-airtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tracksStock: false,
      instantTopup: true,
    },
  });
  return db.product.create({
    data: {
      categoryId: category.id,
      name: "Test Airtime Product",
      slug: `test-airtime-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      price: 50,
      stock: null,
      paymentAccountId,
    },
  });
}

describe("POST /api/orders — resolving a single payment account per order", () => {
  it("rejects a cart whose items are assigned to two different tills", async () => {
    const user = await db.user.create({
      data: { name: "Till Tester", phone: `2547${Date.now() % 100000000}`, passwordHash: "x" },
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);

    const accountA = await makeTestPaymentAccount();
    const accountB = await makeTestPaymentAccount();
    const productA = await makeInstantProduct(accountA.id);
    const productB = await makeInstantProduct(accountB.id);

    const res = await orderRequest({
      items: [
        { productId: productA.id, qty: 1 },
        { productId: productB.id, qty: 1 },
      ],
      fulfilment: "INSTANT_TOPUP",
      topupPhone: user.phone,
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/different tills/i);
  });

  it("accepts a cart where every item shares the same explicit payment account", async () => {
    const user = await db.user.create({
      data: { name: "Till Tester 2", phone: `2547${(Date.now() + 1) % 100000000}`, passwordHash: "x" },
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);

    const account = await makeTestPaymentAccount();
    const productA = await makeInstantProduct(account.id);
    const productB = await makeInstantProduct(account.id);

    const res = await orderRequest({
      items: [
        { productId: productA.id, qty: 1 },
        { productId: productB.id, qty: 2 },
      ],
      fulfilment: "INSTANT_TOPUP",
      topupPhone: user.phone,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const order = await db.order.findUniqueOrThrow({ where: { code: body.data.code } });
    expect(order.paymentAccountId).toBe(account.id);
  });

  it("falls back to the default account for a product with no explicit assignment", async () => {
    const user = await db.user.create({
      data: { name: "Till Tester 3", phone: `2547${(Date.now() + 2) % 100000000}`, passwordHash: "x" },
    });
    vi.mocked(apiUser).mockResolvedValue(user as never);

    const defaultAccount = await makeTestPaymentAccount();
    await setDefaultPaymentAccount(defaultAccount.id);
    const product = await makeInstantProduct(null);

    const res = await orderRequest({
      items: [{ productId: product.id, qty: 1 }],
      fulfilment: "INSTANT_TOPUP",
      topupPhone: user.phone,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const order = await db.order.findUniqueOrThrow({ where: { code: body.data.code } });
    expect(order.paymentAccountId).toBe(defaultAccount.id);
  });
});
