import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDateTime, prettyPhone } from "@/lib/format";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const { status } = await searchParams;
  const valid = ["NEW", "OPEN", "RESOLVED"];
  const active = valid.includes(status || "") ? status! : "NEW";

  const tickets = await db.supportTicket.findMany({
    where: { status: active as "NEW" | "OPEN" | "RESOLVED" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { _count: { select: { replies: true } } },
  });

  const counts = await db.supportTicket.groupBy({ by: ["status"], _count: true });
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count || 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Support inbox</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          Messages customers send from the website. Reply and resolve — they see it instantly.
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "NEW", label: "New", cls: "bg-amber-500 border-amber-500" },
            { key: "OPEN", label: "In conversation", cls: "bg-sky-500 border-sky-500" },
            { key: "RESOLVED", label: "Resolved", cls: "bg-brand-500 border-brand-500" },
          ] as const
        ).map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/support?status=${tab.key}`}
            className={`px-4 py-2 rounded-full text-[13px] font-bold border transition-colors ${
              active === tab.key
                ? tab.cls + " text-white"
                : "bg-surface border-line text-ink-soft hover:border-brand-300"
            }`}
          >
            {tab.label} ({countOf(tab.key)})
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <div className="card p-10 text-center text-ink-mute">Nothing here — inbox zero ✨</div>
        ) : (
          tickets.map((t) => (
            <Link
              key={t.id}
              href={`/admin/support/${t.id}`}
              className="card card-hover p-5 flex items-start gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-ink">{t.subject}</span>
                  {t.status === "NEW" ? <span className="badge badge-amber">New</span> : null}
                  {t.status === "RESOLVED" ? <span className="badge badge-green">Resolved</span> : null}
                </div>
                <p className="text-[13px] text-ink-soft mt-1 line-clamp-2">{t.message}</p>
                <div className="text-[12px] text-ink-mute mt-1.5">
                  {t.name} · {prettyPhone(t.phone)} · {t.code} · {t._count.replies} repl
                  {t._count.replies === 1 ? "y" : "ies"}
                </div>
              </div>
              <div className="text-[12px] text-ink-mute shrink-0 text-right">
                {formatDateTime(t.updatedAt)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
