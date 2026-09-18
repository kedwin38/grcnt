import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { reconcilePayment } from "@/lib/payment-reconciliation";

export const dynamic = "force-dynamic";

// Payment status endpoint — the browser polls this while the customer enters
// their PIN. Doubles as the reconciliation path: if Daraja's callback was
// silent, we proactively query the STK result. The same resolution logic
// also runs in the background (see instrumentation-node.ts) so a payment
// still gets finalised even if nobody is polling this endpoint.
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
  if (!payment) {
    return ok({ status: "PENDING" });
  }
  if (payment.status !== "PENDING") {
    return ok({
      status: payment.status,
      receipt: payment.mpesaReceipt || null,
      resultDesc: payment.resultDesc || null,
    });
  }

  const result = await reconcilePayment(payment.id);
  return ok(result);
}
