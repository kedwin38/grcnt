import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

export default async function AdminAuditPage() {
  await requireAdmin();
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const colorFor = (action: string) => {
    if (action.startsWith("payment.success") || action.startsWith("order.complete")) return "badge-green";
    if (action.includes("fail") || action.includes("delete") || action.includes("refund")) return "badge-red";
    if (action.startsWith("auth") || action.startsWith("settings")) return "badge-blue";
    return "badge-gray";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Audit log</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          Who did what, when — the last 150 events across orders, catalog, settings and sign-ins.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-paper">
              <tr>
                <th className="th">When</th>
                <th className="th">Actor</th>
                <th className="th">Action</th>
                <th className="th">Entity</th>
                <th className="th">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="td text-center py-10 text-ink-mute">No events yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="td text-[13px] whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="td font-semibold text-ink">{log.actorName || "system"}</td>
                    <td className="td"><span className={`badge ${colorFor(log.action)}`}>{log.action}</span></td>
                    <td className="td text-[13px]">
                      {log.entity}
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </td>
                    <td className="td text-[12px] text-ink-mute max-w-64 truncate" title={log.details || ""}>
                      {log.details ? log.details.replace(/[{}"]/g, "").slice(0, 90) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
