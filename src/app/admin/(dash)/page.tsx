import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Download,
  Headset,
  PackageX,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDateTime, formatKES } from "@/lib/format";
import { getSettingGroup } from "@/lib/settings";
import { isSimulated } from "@/lib/daraja";
import { RevenueBars, StatusDonut } from "@/components/admin/Charts";
import { OrderStatusBadge } from "@/components/store/OrderStatus";

const PAID_STATUSES = ["PAID", "PROCESSING", "COMPLETED"] as const;

export default async function AdminDashboard() {
  await requireStaff();

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const start7 = new Date(now.getTime() - 6 * 864e5);
  start7.setHours(0, 0, 0, 0);
  const start30 = new Date(now.getTime() - 29 * 864e5);
  start30.setHours(0, 0, 0, 0);

  const start24h = new Date(now.getTime() - 24 * 3600_000);

  const [
    todayRevenue,
    weekRevenue,
    monthRevenue,
    pendingPayment,
    actionQueue,
    newTickets,
    lowStock,
    recentOrders,
    statusCounts,
    topProductsRaw,
    dailyRevenueRaw,
    mpesa,
    recentPaymentFailures,
  ] = await Promise.all([
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: startToday } },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: start7 } },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: start30 } },
    }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.supportTicket.count({ where: { status: { in: ["NEW", "OPEN"] } } }),
    db.product.count({
      where: { active: true, stock: { not: null, lte: db.product.fields.lowStockAt } },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { items: true } } },
    }),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.orderItem.groupBy({
      by: ["productName"],
      _sum: { qty: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
    db.order.findMany({
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: start30 } },
      select: { createdAt: true, total: true },
    }),
    getSettingGroup("mpesa"),
    db.auditLog.findMany({
      where: { action: "payment.stk_failed", createdAt: { gte: start24h } },
      select: { details: true },
    }),
  ]);

  // Proactive + reactive check: is M-Pesa actually usable right now? Customers
  // never see the reason a payment can't start (that's admin-only detail) —
  // this is where the admin finds out instead.
  const mpesaFieldsMissing =
    !mpesa.consumerKey || !mpesa.consumerSecret || !mpesa.passkey || !mpesa.shortcode;
  const mpesaNotConfigured = !isSimulated() && mpesaFieldsMissing;
  const configFailures24h = recentPaymentFailures.filter((log) => {
    try {
      const code = log.details ? (JSON.parse(log.details) as { code?: string }).code : null;
      return code === "NOT_CONFIGURED" || code === "BAD_CREDENTIALS";
    } catch {
      return false;
    }
  }).length;

  // Build last-14-days revenue series
  const byDay = new Map<string, number>();
  for (const o of dailyRevenueRaw) {
    const key = o.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + o.total);
  }
  const series: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 864e5);
    const key = d.toISOString().slice(0, 10);
    series.push({
      label: d.toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
      value: byDay.get(key) || 0,
    });
  }

  const statusOrder = ["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"];
  const statusColors: Record<string, string> = {
    PENDING_PAYMENT: "#f59e0b",
    PAID: "#0ea5e9",
    PROCESSING: "#6366f1",
    COMPLETED: "#3aa335",
    CANCELLED: "#94a3b8",
    REFUNDED: "#dc2626",
  };
  const statusLabels: Record<string, string> = {
    PENDING_PAYMENT: "Awaiting payment",
    PAID: "Paid",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
  };
  const donutData = statusOrder
    .map((s) => ({
      label: statusLabels[s],
      value: statusCounts.find((c) => c.status === s)?._count || 0,
      color: statusColors[s],
    }))
    .filter((d) => d.value > 0);

  const kpis = [
    {
      label: "Today's revenue",
      value: formatKES(todayRevenue._sum.total || 0),
      icon: Wallet,
      trend: "up" as const,
    },
    {
      label: "Last 7 days",
      value: formatKES(weekRevenue._sum.total || 0),
      icon: ArrowUpRight,
      trend: "up" as const,
    },
    {
      label: "Last 30 days",
      value: formatKES(monthRevenue._sum.total || 0),
      icon: Clock,
      trend: "flat" as const,
    },
    {
      label: "Needs action",
      value: String(actionQueue),
      icon: ShoppingCart,
      trend: actionQueue > 0 ? ("hot" as const) : ("flat" as const),
      href: "/admin/orders?status=PAID",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-ink-soft text-sm mt-0.5">
            Operations at a glance — revenue, queue and stock health.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/admin/export/orders" className="btn btn-md btn-outline">
            <Download className="w-4 h-4" /> Orders CSV
          </a>
          <a href="/api/admin/export/revenue" className="btn btn-md btn-outline">
            <Download className="w-4 h-4" /> Revenue CSV
          </a>
        </div>
      </div>

      {/* Payment-blocking alert — this can stop every sale, so it outranks
          everything else on the dashboard. */}
      {mpesaNotConfigured || configFailures24h > 0 ? (
        <Link
          href="/admin/settings"
          className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4 hover:border-red-400 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold text-red-800">
              {mpesaNotConfigured
                ? "M-Pesa isn't configured — customers can't pay"
                : `M-Pesa payments are failing — ${configFailures24h} customer${configFailures24h > 1 ? "s" : ""} couldn't check out in the last 24 hours`}
            </div>
            <div className="text-[13px] text-red-700 mt-0.5">
              {mpesaNotConfigured
                ? "Add your Daraja consumer key, secret, passkey and shortcode under Settings → M-Pesa, then test the connection."
                : "Your Daraja credentials are set but being rejected. Check them under Settings → M-Pesa and use “Check credentials” to confirm."}
            </div>
          </div>
        </Link>
      ) : null}

      {/* Alerts */}
      {(lowStock > 0 || newTickets > 0 || pendingPayment > 0) && (
        <div className="grid sm:grid-cols-3 gap-3">
          {newTickets > 0 ? (
            <Link href="/admin/support" className="card card-hover p-4 flex items-center gap-3 border-amber-200 bg-amber-50/60">
              <Headset className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-semibold text-ink">
                {newTickets} support message{newTickets > 1 ? "s" : ""} waiting
              </span>
            </Link>
          ) : null}
          {lowStock > 0 ? (
            <Link href="/admin/products?filter=low" className="card card-hover p-4 flex items-center gap-3 border-red-200 bg-red-50/60">
              <PackageX className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-ink">
                {lowStock} product{lowStock > 1 ? "s" : ""} low on stock
              </span>
            </Link>
          ) : null}
          {pendingPayment > 0 ? (
            <Link href="/admin/orders?status=PENDING_PAYMENT" className="card card-hover p-4 flex items-center gap-3 border-line">
              <Clock className="w-5 h-5 text-ink-mute" />
              <span className="text-sm font-semibold text-ink">
                {pendingPayment} order{pendingPayment > 1 ? "s" : ""} awaiting payment
              </span>
            </Link>
          ) : null}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const inner = (
            <div className="card card-hover p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-wider text-ink-mute">
                  {kpi.label}
                </span>
                <kpi.icon
                  className={`w-4.5 h-4.5 ${
                    kpi.trend === "hot" ? "text-amber-500" : "text-brand-500"
                  }`}
                />
              </div>
              <div className="text-2xl font-extrabold text-ink mt-2 tracking-tight">
                {kpi.value}
              </div>
              {kpi.trend === "hot" ? (
                <div className="text-[12px] font-semibold text-amber-600 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> open now
                </div>
              ) : null}
            </div>
          );
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href}>
              {inner}
            </Link>
          ) : (
            <div key={kpi.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-extrabold text-ink">Revenue — last 14 days</h2>
          <div className="mt-4">
            <RevenueBars data={series} />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-extrabold text-ink">Orders by status</h2>
          <div className="mt-5">
            {donutData.length > 0 ? (
              <StatusDonut data={donutData} />
            ) : (
              <p className="text-ink-soft text-sm">No orders yet — they&apos;ll appear here.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="font-extrabold text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-[13px] font-bold text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead className="bg-paper">
                <tr>
                  <th className="th">Order</th>
                  <th className="th">Status</th>
                  <th className="th">Placed</th>
                  <th className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="td text-center py-8 text-ink-mute">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-brand-50/40">
                      <td className="td">
                        <Link href={`/admin/orders/${o.id}`} className="font-bold text-ink hover:text-brand-700">
                          {o.code}
                        </Link>
                        <div className="text-[12px] text-ink-mute">
                          {o._count.items} item{o._count.items === 1 ? "" : "s"} · {o.customerName}
                        </div>
                      </td>
                      <td className="td"><OrderStatusBadge status={o.status} /></td>
                      <td className="td text-[13px]">{formatDateTime(o.createdAt)}</td>
                      <td className="td text-right font-extrabold text-ink">{formatKES(o.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-extrabold text-ink">Top products</h2>
          {topProductsRaw.length === 0 ? (
            <p className="text-ink-soft text-sm mt-3">No sales yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topProductsRaw.map((p, i) => (
                <li key={p.productName} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 text-brand-700 text-[12px] font-extrabold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink truncate">{p.productName}</div>
                    <div className="text-[12px] text-ink-mute">
                      {p._sum.qty} sold · {formatKES(p._sum.lineTotal || 0)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
