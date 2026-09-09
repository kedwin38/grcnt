import { db } from "@/lib/db";

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
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
} = {}) {
  const qty = opts.qty ?? 2;
  const unitPrice = opts.unitPrice ?? 50;
  const total = qty * unitPrice;

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

  return { user, category, product, order, payment };
}

export async function reload<T extends { id: number }>(
  model: { findUniqueOrThrow: (args: { where: { id: number } }) => Promise<T> },
  row: T
): Promise<T> {
  return model.findUniqueOrThrow({ where: { id: row.id } });
}
