import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { orderCreateSchema, zodMessage } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { newOrderCode } from "@/lib/codes";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const user = await apiUser();
  if (!user) return fail("Please log in to place an order.", 401);

  if (!rateLimit(`order:${user.id}`, 10, 5 * 60_000).ok) {
    return fail("Too many orders in a short time. Please wait a moment.", 429);
  }

  const body = await readJson(req);
  const parsed = orderCreateSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const input = parsed.data;

  // Validate every line against live catalog prices (never trust client prices)
  const productIds = input.items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, active: true },
    include: { category: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  for (const item of input.items) {
    const product = byId.get(item.productId);
    if (!product) return fail("One of the items is no longer available. Refresh your cart.", 409);
    if (product.stock !== null && product.stock < item.qty) {
      return fail(
        `${product.name}: only ${product.stock} left in stock. Adjust the quantity.`,
        409
      );
    }
    lines.push({
      product,
      qty: item.qty,
      attributes: product.attributes,
    });
  }

  const hasRouter = lines.some((l) => l.product.category.requiresRouterNumber);
  const hasInstant = lines.some(
    (l) => l.product.category.instantTopup && !l.product.category.requiresRouterNumber
  );
  const hasPhysical = lines.some(
    (l) => !l.product.category.instantTopup && !l.product.category.requiresRouterNumber
  );

  if (hasPhysical && (input.fulfilment === "INSTANT_TOPUP" || input.fulfilment === "ROUTER_TOPUP")) {
    return fail("Devices can't be topped up — choose delivery or pickup.", 422);
  }
  if (hasRouter && input.fulfilment !== "ROUTER_TOPUP") {
    return fail("Router packages must use router top-up fulfilment.", 422);
  }
  if (hasInstant && !input.topupPhone) {
    return fail("Enter the Safaricom number that should receive the top-up.", 422);
  }
  if (hasRouter && !input.routerNumber) {
    return fail("Enter the router number to load the package onto.", 422);
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

  const order = await db.order.create({
    data: {
      code: newOrderCode(),
      userId: user.id,
      customerName: user.name,
      customerPhone: user.phone,
      status: "PENDING_PAYMENT",
      fulfilment: input.fulfilment,
      address: input.fulfilment === "DELIVERY" ? input.address || null : null,
      topupPhone: hasInstant ? input.topupPhone : null,
      routerNumber: hasRouter ? input.routerNumber : null,
      notes: input.notes || null,
      subtotal,
      total: subtotal,
      items: {
        create: lines.map((l) => ({
          productId: l.product.id,
          productName: l.product.name,
          unitPrice: l.product.price,
          qty: l.qty,
          lineTotal: l.product.price * l.qty,
          attributes: l.attributes,
        })),
      },
    },
  });

  await audit({ id: user.id, name: user.name }, "order.created", "order", order.code, {
    total: order.total,
    items: lines.length,
  });

  return ok({ code: order.code, total: order.total });
}

export async function GET() {
  const user = await apiUser();
  if (!user) return fail("Please log in.", 401);
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { code: true, status: true, total: true, createdAt: true },
  });
  return ok(orders);
}
