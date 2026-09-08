import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDateTime, prettyPhone } from "@/lib/format";
import { StaffReply } from "./StaffReply";

export default async function AdminTicketDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (!Number.isInteger(ticketId)) notFound();

  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
      user: { select: { id: true, name: true } },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link href="/admin/support" className="text-[13px] font-semibold text-brand-700 hover:underline">
          ← Support inbox
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">{ticket.subject}</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          {ticket.code} · from {ticket.name} ({prettyPhone(ticket.phone)})
          {ticket.user ? (
            <>
              {" · "}
              <Link href={`/admin/customers/${ticket.user.id}`} className="text-brand-700 font-semibold hover:underline">
                registered customer
              </Link>
            </>
          ) : (
            " · guest"
          )}
          {" · opened "}
          {formatDateTime(ticket.createdAt)}
        </p>
      </div>

      <div className="card p-5">
        <div className="text-[12px] font-bold uppercase tracking-wider text-ink-mute mb-2">
          Customer&apos;s message
        </div>
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{ticket.message}</p>
      </div>

      {ticket.replies.map((r) => (
        <div
          key={r.id}
          className={`card p-5 ${r.fromStaff ? "border-brand-200 bg-brand-50/40" : ""}`}
        >
          <div className="text-[12px] font-bold uppercase tracking-wider text-ink-mute mb-2">
            {r.fromStaff
              ? `${r.author?.name || "Staff"} replied`
              : `${ticket.name} replied`}
            {" · "}
            {formatDateTime(r.createdAt)}
          </div>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{r.body}</p>
        </div>
      ))}

      <StaffReply ticketId={ticket.id} resolved={ticket.status === "RESOLVED"} />
    </div>
  );
}
