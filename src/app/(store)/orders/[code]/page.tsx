import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin, Router, Smartphone, Store, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatKES, prettyPhone } from "@/lib/format";
import { OrderStatusBadge, OrderTimeline, PaymentInfo } from "@/components/store/OrderStatus";
import { PayAgainButton } from "./PayAgainButton";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { code } = await params;
  const { paid } = await searchParams;
  const user = await requireUser(`/orders/${code}`);

  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) notFound();

  const payment =
    order.payments[0] && order.payments[0].status === "SUCCESS"
      ? order.payments[0]
      : null;
  const justPaid = paid === "1" && order.status !== "PENDING_PAYMENT";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      {justPaid ? (
        <div className="card p-8 text-center mb-6 animate-fade-up border-brand-200 bg-gradient-to-b from-brand-50/80 to-surface">
          <div className="mx-auto w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-brand-600" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Asante sana! 🎉</h1>
          <p className="text-ink-soft mt-1.5">
            Payment for <span className="font-bold text-ink">{order.code}</span> received
            {order.fulfilment === "INSTANT_TOPUP"
              ? " — your top-up is landing on your line in moments."
              : order.fulfilment === "ROUTER_TOPUP"
                ? " — we're loading your package onto your router shortly."
                : " — we're preparing your order right away."}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/orders" className="text-[13px] font-semibold text-brand-700 hover:underline">
            ← All orders
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">{order.code}</h2>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-6 grid gap-5">
        <div className="card p-6">
          <h3 className="font-extrabold text-ink">Progress</h3>
          <div className="mt-4">
            <OrderTimeline status={order.status} topupRef={order.topupRef} />
          </div>
          {order.status === "PENDING_PAYMENT" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PayAgainButton code={order.code} />
              <span className="text-[13px] text-ink-mute">
                Complete your M-Pesa payment to start processing.
              </span>
            </div>
          ) : null}
          {order.topupRef && order.status === "COMPLETED" ? (
            <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 text-[13px] font-semibold text-brand-800">
              Top-up transaction ref: <span className="font-extrabold">{order.topupRef}</span>
            </div>
          ) : null}
        </div>

        <div className="card p-6">
          <h3 className="font-extrabold text-ink">Items</h3>
          <ul className="mt-3 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="py-3 flex justify-between gap-3 text-sm">
                <div>
                  <span className="font-semibold text-ink">{item.productName}</span>
                  <span className="text-ink-mute"> × {item.qty}</span>
                  <div className="text-[12px] text-ink-mute">
                    {formatKES(item.unitPrice)} each
                  </div>
                </div>
                <span className="font-extrabold text-ink">{formatKES(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-line flex justify-between items-baseline">
            <span className="font-bold text-ink">Total</span>
            <span className="text-xl font-extrabold">{formatKES(order.total)}</span>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-extrabold text-ink">Delivery & payment</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-line px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                Fulfilment
              </div>
              <div className="font-semibold text-ink mt-1 flex items-center gap-2">
                {order.fulfilment === "INSTANT_TOPUP" ? (
                  <>
                    <Zap className="w-4 h-4 text-brand-600" /> Instant top-up
                  </>
                ) : order.fulfilment === "ROUTER_TOPUP" ? (
                  <>
                    <Router className="w-4 h-4 text-brand-600" /> Router package
                  </>
                ) : order.fulfilment === "DELIVERY" ? (
                  <>
                    <MapPin className="w-4 h-4 text-brand-600" /> Delivery
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4 text-brand-600" /> Pickup
                  </>
                )}
              </div>
              {order.topupPhone ? (
                <div className="text-[13px] text-ink-soft mt-1 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> To {prettyPhone(order.topupPhone)}
                </div>
              ) : null}
              {order.routerNumber ? (
                <div className="text-[13px] text-ink-soft mt-1 flex items-center gap-1.5">
                  <Router className="w-3.5 h-3.5" /> Router {order.routerNumber}
                </div>
              ) : null}
              {order.address ? (
                <div className="text-[13px] text-ink-soft mt-1">{order.address}</div>
              ) : null}
            </div>
            <div className="rounded-xl border border-line px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                Placed by
              </div>
              <div className="font-semibold text-ink mt-1">{order.customerName}</div>
              <div className="text-[13px] text-ink-soft">{prettyPhone(order.customerPhone)}</div>
            </div>
          </div>
          {payment ? <PaymentInfo payment={payment} /> : null}
        </div>
      </div>
    </div>
  );
}
