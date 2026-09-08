import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDateTime, formatKES, prettyPhone } from "@/lib/format";
import { OrderStatusBadge, type OrderStatusStr } from "@/components/store/OrderStatus";

const STATUS_TABS: (OrderStatusStr | "ALL")[] = [
  "ALL",
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireStaff();
  const { status, q } = await searchParams;
  const activeStatus = STATUS_TABS.includes((status as OrderStatusStr) || "ALL")
    ? (status as OrderStatusStr | "ALL")
    : "ALL";
  const search = (q || "").trim();

  const orders = await db.order.findMany({
    where: {
      ...(activeStatus !== "ALL" ? { status: activeStatus } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search.toUpperCase() } },
              { customerName: { contains: search } },
              { customerPhone: { contains: search.replace(/\D/g, "") } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Orders</h1>
          <p className="text-ink-soft text-sm mt-0.5">
            Fulfil paid orders, reconcile payments, keep customers smiling.
          </p>
        </div>
        <form action="/admin/orders" method="GET" className="flex gap-2">
          <input type="hidden" name="status" value={activeStatus} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
            <input
              name="q"
              defaultValue={search}
              className="input pl-9 w-60"
              placeholder="Search code, name, phone…"
            />
          </div>
          <button className="btn btn-md btn-primary">Search</button>
        </form>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/orders?status=${tab}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-colors ${
              activeStatus === tab
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-surface border-line text-ink-soft hover:border-brand-300"
            }`}
          >
            {tab === "ALL"
              ? "All"
              : tab === "PENDING_PAYMENT"
                ? "Awaiting payment"
                : tab === "PAID"
                  ? "Paid"
                  : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-paper">
              <tr>
                <th className="th">Order</th>
                <th className="th">Customer</th>
                <th className="th">Type</th>
                <th className="th">Status</th>
                <th className="th">Placed</th>
                <th className="th text-right">Total</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="td text-center py-10 text-ink-mute">
                    No orders match this view.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-brand-50/40">
                    <td className="td">
                      <Link href={`/admin/orders/${o.id}`} className="font-bold text-ink hover:text-brand-700">
                        {o.code}
                      </Link>
                      <div className="text-[12px] text-ink-mute">{o._count.items} item(s)</div>
                    </td>
                    <td className="td">
                      <div className="font-semibold text-ink">{o.customerName}</div>
                      <div className="text-[12px] text-ink-mute">{prettyPhone(o.customerPhone)}</div>
                    </td>
                    <td className="td text-[13px]">
                      {o.fulfilment === "INSTANT_TOPUP"
                        ? "⚡ Top-up"
                        : o.fulfilment === "DELIVERY"
                          ? "🚚 Delivery"
                          : "🏪 Pickup"}
                    </td>
                    <td className="td"><OrderStatusBadge status={o.status} /></td>
                    <td className="td text-[13px]">{formatDateTime(o.createdAt)}</td>
                    <td className="td text-right font-extrabold text-ink">{formatKES(o.total)}</td>
                    <td className="td text-right">
                      <Link href={`/admin/orders/${o.id}`} className="btn btn-sm btn-outline">
                        Open <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
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
