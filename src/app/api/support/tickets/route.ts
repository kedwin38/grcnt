import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson, clientIp } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { ticketCreateSchema, zodMessage } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { newTicketCode } from "@/lib/codes";
import { normalizePhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ip = clientIp(req);
  if (!rateLimit(`ticket:${ip}`, 5, 60 * 60_000).ok) {
    return fail("You've sent several messages recently. Please wait a while.", 429);
  }

  const body = await readJson(req);
  const parsed = ticketCreateSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  const user = await apiUser();
  const { name, phone, subject, message, orderCode } = parsed.data;

  const ticket = await db.supportTicket.create({
    data: {
      code: newTicketCode(),
      userId: user?.id ?? null,
      name,
      phone,
      subject,
      message: orderCode ? `${message}\n\n(Ref: order ${orderCode})` : message,
    },
  });

  return ok({ code: ticket.code });
}

export async function GET() {
  const user = await apiUser();
  if (!user) return fail("Please log in.", 401);
  const tickets = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      code: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { replies: true } },
    },
  });
  return ok(tickets);
}
