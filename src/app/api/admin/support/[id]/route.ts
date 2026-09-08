import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const replySchema = z.object({
  body: z.string().trim().min(1, "Write a reply first").max(2000),
  resolve: z.boolean().optional(),
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
  const ticketId = parseInt(id, 10);
  if (!Number.isInteger(ticketId)) return fail("Invalid ticket.", 422);

  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return fail("Ticket not found.", 404);

  const body = await readJson(req);
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid reply.", 422);

  await db.$transaction([
    db.ticketReply.create({
      data: {
        ticketId,
        authorId: user.id,
        fromStaff: true,
        body: parsed.data.body,
      },
    }),
    db.supportTicket.update({
      where: { id: ticketId },
      data: { status: parsed.data.resolve ? "RESOLVED" : "OPEN" },
    }),
  ]);

  await audit({ id: user.id, name: user.name }, "ticket.reply", "ticket", ticket.code, {
    resolved: !!parsed.data.resolve,
  });
  return ok({ replied: true });
}
