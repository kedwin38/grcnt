import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDateTime, formatKES, prettyPhone } from "@/lib/format";
import { OrderStatusBadge } from "@/components/store/OrderStatus";

export default async function AdminCustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const userId = parseInt(id, 10);
  if (!Number.isInteger(userId)) notFound();

  const customer = await db.user.findUnique({
    where: { id: userId },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 50 },
      tickets: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) notFound();

  const lifetime = customer.orders
    .filter((o) => ["PAID", "PROCESSING", "COMPLETED"].includes(o.status))
    .reduce((n, o) => n + o.total, 0);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <Link href="/admin/customers" className="text-[13px] font-semibold text-brand-700 hover:underline">
          ← Customers
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">{customer.name}</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          {prettyPhone(customer.phone)}
          {customer.email ? ` · ${customer.email}` : ""} · joined{" "}
          {formatDateTime(customer.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-[12px] font-bold uppercase tracking-wider text-ink-mute">Orders</div>
          <div className="text-2xl font-extrabold mt-1">{customer.orders.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-[12px] font-bold uppercase tracking-wider text-ink-mute">Lifetime value</div>
          <div className="text-2xl font-extrabold mt-1">{formatKES(lifetime)}</div>
        </div>
        <div className="card p-5">
          <div className="text-[12px] font-bold uppercase tracking-wider text-ink-mute">Support tickets</div>
          <div className="text-2xl font-extrabold mt-1">{customer.tickets.length}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-line font-extrabold text-ink">Order history</div>
        <table className="w-full">
          <tbody className="divide-y divide-line">
            {customer.orders.length === 0 ? (
              <tr>
                <td className="td text-center py-8 text-ink-mute">No orders yet.</td>
              </tr>
            ) : (
              customer.orders.map((o) => (
                <tr key={o.id} className="hover:bg-brand-50/40">
                  <td className="td">
                    <Link href={`/admin/orders/${o.id}`} className="font-bold text-ink hover:text-brand-700">
                      {o.code}
                    </Link>
                  </td>
                  <td className="td"><OrderStatusBadge status={o.status} /></td>
                  <td className="td text-[13px]">{formatDateTime(o.createdAt)}</td>
                  <td className="td text-right font-extrabold">{formatKES(o.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
