import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { ticketReplySchema, zodMessage } from "@/lib/validation";
import { normalizePhone } from "@/lib/format";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Access rule: ticket owner (linked account), or guest with code + phone. */
async function authorize(code: string, req: NextRequest) {
  const ticket = await db.supportTicket.findUnique({ where: { code } });
  if (!ticket) return { error: fail("Ticket not found.", 404) } as const;

  const user = await apiUser();
  if (user && ticket.userId === user.id) {
    return { ticket, userId: user.id } as const;
  }

  const phoneParam = req.nextUrl.searchParams.get("phone");
  const phone = phoneParam ? normalizePhone(phoneParam) : null;
  if (phone && ticket.phone === phone) {
    return { ticket, userId: null } as const;
  }

  return { error: fail("Provide the phone number used when creating this ticket.", 403) } as const;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const auth = await authorize(code, req);
  if ("error" in auth) return auth.error;

  const ticket = await db.supportTicket.findUnique({
    where: { code },
    include: {
      replies: { orderBy: { createdAt: "asc" } },
    },
  });
  return ok({
    code: ticket!.code,
    subject: ticket!.subject,
    status: ticket!.status,
    createdAt: ticket!.createdAt,
    replies: ticket!.replies.map((r) => ({
      fromStaff: r.fromStaff,
      body: r.body,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const { code } = await params;
  const auth = await authorize(code, req);
  if ("error" in auth) return auth.error;
  const { ticket, userId } = auth;

  if (!rateLimit(`reply:${ticket.id}`, 10, 10 * 60_000).ok) {
    return fail("Too many replies. Please slow down.", 429);
  }

  const body = await readJson(req);
  const parsed = ticketReplySchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  await db.ticketReply.create({
    data: {
      ticketId: ticket.id,
      authorId: userId,
      fromStaff: false,
      body: parsed.data.body,
    },
  });
  await db.supportTicket.update({
    where: { id: ticket.id },
    data: { status: "OPEN" },
  });
  return ok({ replied: true });
}
