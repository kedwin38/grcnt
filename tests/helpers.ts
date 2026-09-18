import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/**
 * A working Daraja payment account for tests. Every order/payment fixture
 * gets its own — the real routes resolve credentials via
 * order.paymentAccountId, so tests must have a real row to point at rather
 * than relying on some shared "default" (multiple test files share one
 * physical SQLite file, so a global default would be a cross-file race).
 */
export async function makeTestPaymentAccount(opts: {
  transactionType?: "CustomerBuyGoodsOnline" | "CustomerPayBillOnline";
  tillNumber?: string | null;
  isDefault?: boolean;
} = {}) {
  return db.paymentAccount.create({
    data: {
      label: unique("Test Till"),
      environment: "sandbox",
      consumerKey: encrypt("test-consumer-key"),
      consumerSecret: encrypt("test-consumer-secret"),
      passkey: encrypt("test-passkey"),
      shortcode: "600123",
      transactionType: opts.transactionType ?? "CustomerBuyGoodsOnline",
      tillNumber: opts.tillNumber === undefined ? "3547433" : opts.tillNumber,
      callbackBaseUrl: null,
      isDefault: opts.isDefault ?? false,
      active: true,
    },
  });
}

// Vitest runs each test file in its own worker process, and every file
// shares the same physical SQLite test DB — a plain per-file counter isn't
// enough to avoid collisions across files, so fold in the process PID too.
function uniquePhone() {
  counter += 1;
  const pid = String(process.pid % 100_000).padStart(5, "0");
  return `254${pid}${String(counter).padStart(4, "0")}`;
}

/**
 * Builds a full Order + OrderItem + PENDING Payment fixture, matching what a
 * real checkout produces, so tests exercise the real reconciliation code
 * paths (stock decrement, order status) rather than a simplified stand-in.
 */
export async function makePendingOrderWithPayment(opts: {
  qty?: number;
  unitPrice?: number;
  stock?: number | null;
  checkoutRequestId?: string;
  simulated?: boolean;
  paymentCreatedAt?: Date;
  fulfilment?: "INSTANT_TOPUP" | "ROUTER_TOPUP" | "PICKUP" | "DELIVERY";
} = {}) {
  const qty = opts.qty ?? 2;
  const unitPrice = opts.unitPrice ?? 50;
  const total = qty * unitPrice;

  const paymentAccount = await makeTestPaymentAccount();

  const user = await db.user.create({
    data: {
      name: "Test Customer",
      phone: uniquePhone(),
      passwordHash: "not-a-real-hash",
    },
  });

  const category = await db.category.create({
    data: {
      name: "Test Bundles",
      slug: unique("test-bundles"),
      tracksStock: true,
      instantTopup: true,
    },
  });

  const product = await db.product.create({
    data: {
      categoryId: category.id,
      name: "Test 1GB Bundle",
      slug: unique("test-1gb-bundle"),
      price: unitPrice,
      stock: opts.stock === undefined ? 10 : opts.stock,
    },
  });

  const order = await db.order.create({
    data: {
      code: unique("GCN-TEST"),
      userId: user.id,
      customerName: user.name,
      customerPhone: user.phone,
      status: "PENDING_PAYMENT",
      fulfilment: opts.fulfilment ?? "INSTANT_TOPUP",
      paymentAccountId: paymentAccount.id,
      subtotal: total,
      total,
      topupPhone: user.phone,
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            unitPrice,
            qty,
            lineTotal: total,
          },
        ],
      },
    },
  });

  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      status: "PENDING",
      amount: total,
      phone: user.phone,
      merchantRequestId: unique("merchant-req"),
      checkoutRequestId: opts.checkoutRequestId ?? unique("ws_CO_test"),
      simulated: opts.simulated ?? false,
      createdAt: opts.paymentCreatedAt ?? new Date(),
    },
  });

  return { user, category, product, order, payment, paymentAccount };
}

export async function reload<T extends { id: number }>(
  model: { findUniqueOrThrow: (args: { where: { id: number } }) => Promise<T> },
  row: T
): Promise<T> {
  return model.findUniqueOrThrow({ where: { id: row.id } });
}
