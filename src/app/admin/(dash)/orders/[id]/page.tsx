import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDateTime, formatKES, prettyPhone } from "@/lib/format";
import { OrderStatusBadge, OrderTimeline } from "@/components/store/OrderStatus";
import { OrderActions } from "./OrderActions";

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (!Number.isInteger(orderId)) notFound();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, name: true, phone: true, createdAt: true } },
    },
  });
  if (!order) notFound();

  const paidPayment = order.payments.find((p) => p.status === "SUCCESS");

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/orders" className="text-[13px] font-semibold text-brand-700 hover:underline">
            ← All orders
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 flex items-center gap-3">
            {order.code} <OrderStatusBadge status={order.status} />
          </h1>
          <p className="text-ink-soft text-sm mt-0.5">
            Placed {formatDateTime(order.createdAt)} · {order.fulfilment.replace("_", " ").toLowerCase()}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="font-extrabold text-ink">Progress</h2>
            <div className="mt-4">
              <OrderTimeline status={order.status} topupRef={order.topupRef} />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-extrabold text-ink">Items</h2>
            <ul className="mt-3 divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="py-3 flex justify-between gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-ink">{item.productName}</span>
                    <span className="text-ink-mute"> × {item.qty}</span>
                    <div className="text-[12px] text-ink-mute">{formatKES(item.unitPrice)} each</div>
                  </div>
                  <span className="font-extrabold text-ink">{formatKES(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-line flex justify-between items-baseline">
              <span className="font-bold">Total</span>
              <span className="text-xl font-extrabold">{formatKES(order.total)}</span>
            </div>
          </div>

          {order.payments.length > 0 ? (
            <div className="card p-6">
              <h2 className="font-extrabold text-ink">Payment attempts</h2>
              <table className="w-full mt-3 text-sm">
                <tbody className="divide-y divide-line">
                  {order.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5">
                        <span
                          className={`badge ${
                            p.status === "SUCCESS"
                              ? "badge-green"
                              : p.status === "PENDING"
                                ? "badge-amber"
                                : "badge-gray"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-ink-soft">{prettyPhone(p.phone)}</td>
                      <td className="py-2.5 text-ink-soft">{formatKES(p.amount)}</td>
                      <td className="py-2.5 text-ink-soft text-[12px]">
                        {p.mpesaReceipt || p.resultDesc || "—"}
                      </td>
                      <td className="py-2.5 text-[12px] text-ink-mute text-right">
                        {formatDateTime(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <OrderActions
            orderId={order.id}
            status={order.status}
            fulfilment={order.fulfilment}
            topupRef={order.topupRef || ""}
            canModifyPrices={staff.role === "ADMIN"}
          />

          <div className="card p-6 space-y-4 text-sm">
            <h2 className="font-extrabold text-ink">Customer</h2>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">Name</span>
              <Link href={`/admin/customers/${order.user.id}`} className="font-bold text-ink hover:text-brand-700">
                {order.customerName}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">Phone</span>
              <a href={`tel:+${order.customerPhone}`} className="font-bold text-ink hover:text-brand-700">
                {prettyPhone(order.customerPhone)}
              </a>
            </div>
            {order.topupPhone ? (
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Top-up line</span>
                <span className="font-bold text-ink">{prettyPhone(order.topupPhone)}</span>
              </div>
            ) : null}
            {order.routerNumber ? (
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Router number</span>
                <span className="font-bold text-ink">{order.routerNumber}</span>
              </div>
            ) : null}
            {order.address ? (
              <div>
                <span className="text-ink-soft block mb-1">Delivery address</span>
                <span className="font-semibold text-ink">{order.address}</span>
              </div>
            ) : null}
            {order.notes ? (
              <div>
                <span className="text-ink-soft block mb-1">Customer note</span>
                <span className="text-ink">{order.notes}</span>
              </div>
            ) : null}
            {paidPayment ? (
              <div className="pt-3 border-t border-line">
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft">M-Pesa receipt</span>
                  <span className="font-extrabold text-brand-700">
                    {paidPayment.mpesaReceipt || "—"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
