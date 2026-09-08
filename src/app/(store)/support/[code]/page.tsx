import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TicketThread } from "./TicketThread";

export const metadata = { title: "Conversation", robots: { index: false } };

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ phone?: string }>;
}) {
  const { code } = await params;
  const { phone } = await searchParams;

  const ticket = await db.supportTicket.findUnique({
    where: { code: code.toUpperCase() },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  return (
    <TicketThread
      code={ticket.code}
      subject={ticket.subject}
      status={ticket.status}
      phone={phone || ""}
      messages={[
        { fromStaff: false, body: ticket.message, createdAt: ticket.createdAt.toISOString() },
        ...ticket.replies.map((r) => ({
          fromStaff: r.fromStaff,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
        })),
      ]}
    />
  );
}
