import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson, resolveOrigin } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { stkSchema, zodMessage } from "@/lib/validation";
import { getSettingGroup } from "@/lib/settings";
import { stkPush, DarajaError, isSimulated } from "@/lib/daraja";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const user = await apiUser();
  if (!user) return fail("Please log in.", 401);

  if (!rateLimit(`stk:${user.id}`, 6, 5 * 60_000).ok) {
    return fail("Too many payment attempts. Wait a moment before trying again.", 429);
  }

  const body = await readJson(req);
  const parsed = stkSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const { code, phone } = parsed.data;

  const order = await db.order.findFirst({
    where: { code, userId: user.id, status: "PENDING_PAYMENT" },
  });
  if (!order) return fail("Order not found or already paid.", 404);

  const mpesa = await getSettingGroup("mpesa");
  const callbackUrl = `${resolveOrigin(req, mpesa.callbackBaseUrl || undefined)}/api/mpesa/callback`;

  // Local/demo simulation — no Daraja call, no internet required.
  if (isSimulated()) {
    const fakeId = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await db.payment.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        amount: order.total,
        phone,
        merchantRequestId: fakeId,
        checkoutRequestId: fakeId,
        simulated: true,
      },
    });
    return ok({
      simulated: true,
      message: "Simulated M-Pesa prompt sent (demo mode). Confirming shortly…",
    });
  }

  try {
    const res = await stkPush({
      amount: order.total,
      phone,
      accountReference: order.code,
      description: `Order ${order.code}`,
      callbackUrl,
    });
    await db.payment.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        amount: order.total,
        phone,
        merchantRequestId: res.MerchantRequestID,
        checkoutRequestId: res.CheckoutRequestID,
        resultDesc: res.CustomerMessage,
      },
    });
    return ok({ message: res.CustomerMessage || "M-Pesa prompt sent." });
  } catch (err) {
    if (err instanceof DarajaError) {
      // Full detail (bad credentials, misconfigured till, raw Daraja response)
      // is an admin/ops concern — logged and audited, never shown to the
      // customer, who only needs to know payment isn't available right now.
      console.error(`stk push failed for order ${order.code} [${err.code}]:`, err.message);
      await audit(
        { id: user.id, name: user.name },
        "payment.stk_failed",
        "order",
        order.code,
        { error: err.message, code: err.code }
      );
      return fail(
        "We couldn't start the M-Pesa payment right now. Please try again in a moment, or contact support if this continues.",
        502,
        "PAYMENT_UNAVAILABLE"
      );
    }
    console.error("stk push error:", err);
    return fail("Could not reach M-Pesa. Check your connection and try again.", 502);
  }
}
