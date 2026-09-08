import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDateTime, formatKES } from "@/lib/format";
import { OrderStatusBadge } from "@/components/store/OrderStatus";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="section-title">My orders</h1>
      <p className="text-ink-soft mt-1">Every purchase, one place.</p>

      {orders.length === 0 ? (
        <div className="card mt-8 p-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center">
            <PackageOpen className="w-7 h-7 text-brand-500" />
          </div>
          <h2 className="mt-4 font-extrabold text-lg">No orders yet</h2>
          <p className="text-ink-soft text-sm mt-1">
            Your first bundle is a few taps away.
          </p>
          <Link href="/shop" className="btn btn-lg btn-primary mt-5">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.code}`}
              className="card card-hover p-4 sm:p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-extrabold text-ink">{order.code}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="text-[13px] text-ink-mute mt-1">
                  {formatDateTime(order.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-ink">{formatKES(order.total)}</div>
                <div className="text-[12px] text-brand-700 font-semibold flex items-center gap-0.5">
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
