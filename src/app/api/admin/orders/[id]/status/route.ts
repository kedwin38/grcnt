import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["process", "complete", "cancel", "refund"]),
  topupRef: z.string().trim().max(120).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const user = await apiUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return fail("Staff access required.", 403);
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (!Number.isInteger(orderId)) return fail("Invalid order.", 422);

  const body = await readJson(req);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid action.", 422);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { category: true } } } } },
  });
  if (!order) return fail("Order not found.", 404);

  const actor = { id: user.id, name: user.name };

  switch (parsed.data.action) {
    case "process": {
      if (order.status !== "PAID") return fail("Only paid orders can be processed.", 409);
      await db.order.update({ where: { id: order.id }, data: { status: "PROCESSING" } });
      await audit(actor, "order.process", "order", order.code);
      return ok({ status: "PROCESSING" });
    }
    case "complete": {
      if (order.status !== "PAID" && order.status !== "PROCESSING") {
        return fail("Only paid/processing orders can be completed.", 409);
      }
      await db.order.update({
        where: { id: order.id },
        data: { status: "COMPLETED", topupRef: parsed.data.topupRef || order.topupRef },
      });
      await audit(actor, "order.complete", "order", order.code, {
        topupRef: parsed.data.topupRef || null,
      });
      return ok({ status: "COMPLETED" });
    }
    case "cancel": {
      if (order.status !== "PENDING_PAYMENT") {
        return fail("Only unpaid orders can be cancelled outright — refund paid ones instead.", 409);
      }
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await audit(actor, "order.cancel", "order", order.code);
      return ok({ status: "CANCELLED" });
    }
    case "refund": {
      if (order.status === "PENDING_PAYMENT" || order.status === "CANCELLED" || order.status === "REFUNDED") {
        return fail("This order can't be refunded.", 409);
      }
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
        // Return stock for tracked products
        for (const item of order.items) {
          if (item.product && item.product.category.tracksStock) {
            await tx.product.update({
              where: { id: item.product.id },
              data: { stock: { increment: item.qty } },
            });
          }
        }
      });
      await audit(actor, "order.refund", "order", order.code);
      return ok({ status: "REFUNDED" });
    }
  }
}
