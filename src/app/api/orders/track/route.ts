import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { normalizePhone } from "@/lib/format";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Public order tracking: order code + the phone number used at checkout.
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`track:${ip}`, 20, 5 * 60_000).ok) {
    return fail("Too many lookups. Please wait a moment.", 429);
  }

  const code = (req.nextUrl.searchParams.get("code") || "").trim().toUpperCase();
  const phoneRaw = req.nextUrl.searchParams.get("phone") || "";
  const phone = normalizePhone(phoneRaw);
  if (!/^GCN-[A-Z0-9]{4,12}$/.test(code) || !phone) {
    return fail("Enter your order code and the phone number you used.", 422);
  }

  const order = await db.order.findFirst({
    where: { code, OR: [{ customerPhone: phone }, { topupPhone: phone }] },
    include: { items: true, payments: { where: { status: "SUCCESS" }, take: 1 } },
  });
  if (!order) {
    return fail("No order found with that code and phone number.", 404);
  }

  return ok({
    code: order.code,
    status: order.status,
    total: order.total,
    fulfilment: order.fulfilment,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({ name: i.productName, qty: i.qty, lineTotal: i.lineTotal })),
    receipt: order.payments[0]?.mpesaReceipt || null,
    topupRef: order.topupRef,
  });
}
