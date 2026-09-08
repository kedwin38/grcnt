"use client";

import { useState } from "react";
import { PackageSearch, Loader2, Search } from "lucide-react";
import { api } from "@/lib/client";
import { formatDateTime, formatKES } from "@/lib/format";
import { OrderStatusBadge, OrderTimeline } from "@/components/store/OrderStatus";

type TrackedOrder = {
  code: string;
  status: "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
  total: number;
  fulfilment: string;
  createdAt: string;
  items: { name: string; qty: number; lineTotal: number }[];
  receipt: string | null;
  topupRef: string | null;
};

export default function TrackOrderPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setBusy(true);
    try {
      const data = await api<TrackedOrder>(
        `/api/orders/track?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`
      );
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
          <PackageSearch className="w-7 h-7 text-brand-600" />
        </div>
        <h1 className="section-title mt-4">Track your order</h1>
        <p className="text-ink-soft mt-1.5 text-[15px]">
          Enter the order code we gave you at checkout plus your phone number.
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 mt-8 space-y-4">
        <div>
          <label htmlFor="code" className="label">Order code</label>
          <input
            id="code"
            className="input font-semibold tracking-wider uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="GCN-XXXXXX"
            required
          />
        </div>
        <div>
          <label htmlFor="tphone" className="label">Phone number used on the order</label>
          <input
            id="tphone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0712 345 678"
            inputMode="tel"
            required
          />
        </div>
        <button type="submit" className="btn btn-lg btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Search className="w-4.5 h-4.5" />}
          {busy ? "Searching…" : "Find my order"}
        </button>
        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3">
            {error}
          </div>
        ) : null}
      </form>

      {order ? (
        <div className="card p-6 mt-6 animate-fade-up">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-extrabold text-ink">{order.code}</div>
              <div className="text-[13px] text-ink-mute">{formatDateTime(order.createdAt)}</div>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="mt-5">
            <OrderTimeline status={order.status} topupRef={order.topupRef} />
          </div>
          <ul className="mt-5 pt-4 border-t border-line space-y-2">
            {order.items.map((i) => (
              <li key={i.name} className="flex justify-between text-sm">
                <span className="text-ink-soft">
                  <span className="font-semibold text-ink">{i.name}</span> × {i.qty}
                </span>
                <span className="font-bold">{formatKES(i.lineTotal)}</span>
              </li>
            ))}
            <li className="flex justify-between pt-2 border-t border-line">
              <span className="font-bold">Total</span>
              <span className="font-extrabold">{formatKES(order.total)}</span>
            </li>
          </ul>
          {order.receipt ? (
            <div className="mt-4 text-[13px] text-ink-soft">
              M-Pesa receipt: <span className="font-bold text-ink">{order.receipt}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
