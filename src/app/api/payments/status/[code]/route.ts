import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { stkQuery, isSimulated } from "@/lib/daraja";
import { newOrderCode } from "@/lib/codes";

export const dynamic = "force-dynamic";

// Payment status endpoint — the browser polls this while the customer enters
// their PIN. Doubles as the reconciliation path: if Daraja's callback was
// silent, we proactively query the STK result.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const user = await apiUser();
  if (!user) return fail("Please log in.", 401);

  const { code } = await params;
  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) return fail("Order not found.", 404);

  // Already finalised via callback
  if (order.status === "PAID" || order.status === "PROCESSING" || order.status === "COMPLETED") {
    const paid = order.payments[0];
    return ok({
      status: "SUCCESS",
      receipt: paid?.mpesaReceipt || null,
      orderStatus: order.status,
    });
  }

  const payment = order.payments[0];
  if (!payment || payment.status !== "PENDING") {
    return ok({
      status: payment ? payment.status : "PENDING",
      receipt: payment?.mpesaReceipt || null,
      resultDesc: payment?.resultDesc || null,
    });
  }

  const ageMs = Date.now() - payment.createdAt.getTime();

  // Simulated demo payment resolves after a short delay.
  if (payment.simulated && ageMs > 6000) {
    const receipt = `SIM${newOrderCode().slice(4, 10)}`;
    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", mpesaReceipt: receipt, resultCode: "0", resultDesc: "Simulated success" },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });
      for (const item of await tx.orderItem.findMany({ where: { orderId: order.id }, include: { product: { include: { category: true } } } })) {
        if (item.product && item.product.category.tracksStock && item.product.stock !== null) {
          await tx.product.update({
            where: { id: item.product.id },
            data: { stock: { decrement: item.qty } },
          });
        }
      }
    });
    return ok({ status: "SUCCESS", receipt, orderStatus: "PAID" });
  }

  // Safety net: query Daraja directly when the callback is late.
  if (!payment.simulated && ageMs > 12000 && payment.checkoutRequestId) {
    try {
      const result = await stkQuery(payment.checkoutRequestId);
      const rc = result.ResultCode ?? result.ResponseCode;
      if (rc === "0") {
        const receipt = extractReceiptQuery(result);
        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "SUCCESS", resultCode: rc, resultDesc: result.ResultDesc, mpesaReceipt: receipt },
          });
          await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
          for (const item of await tx.orderItem.findMany({ where: { orderId: order.id }, include: { product: { include: { category: true } } } })) {
            if (item.product && item.product.category.tracksStock && item.product.stock !== null) {
              await tx.product.update({ where: { id: item.product.id }, data: { stock: { decrement: item.qty } } });
            }
          }
        });
        return ok({ status: "SUCCESS", receipt, orderStatus: "PAID" });
      }
      if (rc !== undefined && rc !== null) {
        const cancelled = rc === "1032";
        await db.payment.update({
          where: { id: payment.id },
          data: { status: cancelled ? "CANCELLED" : "FAILED", resultCode: rc, resultDesc: result.ResultDesc },
        });
        return ok({ status: cancelled ? "CANCELLED" : "FAILED", resultDesc: result.ResultDesc });
      }
    } catch {
      /* query not ready yet — keep polling */
    }
  }

  return ok({ status: "PENDING" });
}

function extractReceiptQuery(result: { ResultDesc?: string }): string | null {
  // Push Query doesn't return the receipt code directly; keep desc as reference.
  return result.ResultDesc ? null : null;
}
