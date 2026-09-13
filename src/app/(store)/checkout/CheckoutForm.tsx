"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, MapPin, Router, Store, Smartphone, Zap } from "lucide-react";
import { useCart } from "@/components/store/CartProvider";
import { formatKES, prettyPhone } from "@/lib/format";
import { api } from "@/lib/client";

type Fulfilment = "INSTANT_TOPUP" | "ROUTER_TOPUP" | "PICKUP" | "DELIVERY";

export function CheckoutForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const hasRouter = useMemo(() => items.some((i) => i.requiresRouterNumber), [items]);
  const hasPhysical = useMemo(() => items.some((i) => !i.instant && !i.requiresRouterNumber), [items]);
  const hasInstant = useMemo(() => items.some((i) => i.instant && !i.requiresRouterNumber), [items]);

  const [fulfilment, setFulfilment] = useState<Fulfilment>("INSTANT_TOPUP");
  // The cart hydrates from localStorage a tick after mount, so `items` (and
  // therefore hasPhysical/hasRouter) is still empty on the very first render
  // — pick the real default once real cart contents are known, but only
  // once, so it doesn't stomp on a manual Delivery/Pickup toggle later.
  const fulfilmentReady = useRef(false);
  useEffect(() => {
    if (fulfilmentReady.current || items.length === 0) return;
    fulfilmentReady.current = true;
    setFulfilment(hasPhysical ? "DELIVERY" : hasRouter ? "ROUTER_TOPUP" : "INSTANT_TOPUP");
  }, [items.length, hasPhysical, hasRouter]);
  const [topupPhone, setTopupPhone] = useState(prettyPhone(defaultPhone));
  const [routerNumber, setRouterNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    setError(null);
    setBusy(true);
    try {
      const data = await api<{ code: string }>("/api/orders", {
        body: {
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          fulfilment,
          topupPhone: hasInstant ? topupPhone : undefined,
          routerNumber: hasRouter ? routerNumber : undefined,
          address: fulfilment === "DELIVERY" ? address : "",
          notes,
        },
      });
      clear();
      router.push(`/checkout/pay/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place your order. Please try again.");
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card mt-8 p-14 text-center">
        <h2 className="font-extrabold text-lg">Your cart is empty</h2>
        <p className="text-ink-soft text-sm mt-1">Add something first — we&apos;ll be right here.</p>
        <Link href="/shop" className="btn btn-lg btn-primary mt-5">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
      <div className="space-y-6">
        {/* Fulfilment choice — Hick's law: only the options that apply */}
        <section className="card p-6">
          <h2 className="font-extrabold text-ink">How should we deliver?</h2>
          <div className="mt-4 grid gap-3">
            {hasInstant && !hasPhysical ? (
              <button
                type="button"
                onClick={() => setFulfilment("INSTANT_TOPUP")}
                className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  fulfilment === "INSTANT_TOPUP"
                    ? "border-brand-500 bg-brand-50/60"
                    : "border-line hover:border-brand-300"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-brand-700" />
                </div>
                <div>
                  <div className="font-bold text-ink">Instant top-up</div>
                  <div className="text-[13px] text-ink-soft">
                    Bundles and airtime delivered to your Safaricom line seconds after payment.
                  </div>
                </div>
              </button>
            ) : null}

            {hasRouter && !hasPhysical ? (
              <button
                type="button"
                onClick={() => setFulfilment("ROUTER_TOPUP")}
                className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                  fulfilment === "ROUTER_TOPUP"
                    ? "border-brand-500 bg-brand-50/60"
                    : "border-line hover:border-brand-300"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                  <Router className="w-5 h-5 text-brand-700" />
                </div>
                <div>
                  <div className="font-bold text-ink">Router package</div>
                  <div className="text-[13px] text-ink-soft">
                    Loaded onto your router by our team shortly after payment.
                  </div>
                </div>
              </button>
            ) : null}

            {hasPhysical ? (
              <>
                <button
                  type="button"
                  onClick={() => setFulfilment("DELIVERY")}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                    fulfilment === "DELIVERY"
                      ? "border-brand-500 bg-brand-50/60"
                      : "border-line hover:border-brand-300"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-brand-700" />
                  </div>
                  <div>
                    <div className="font-bold text-ink">Delivery</div>
                    <div className="text-[13px] text-ink-soft">
                      We deliver devices to your address. Our team confirms timing after payment.
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfilment("PICKUP")}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                    fulfilment === "PICKUP"
                      ? "border-brand-500 bg-brand-50/60"
                      : "border-line hover:border-brand-300"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-brand-700" />
                  </div>
                  <div>
                    <div className="font-bold text-ink">Pick up at our shop</div>
                    <div className="text-[13px] text-ink-soft">
                      Collect your order from our premises — pay first, skip the queue.
                    </div>
                  </div>
                </button>
              </>
            ) : null}
          </div>
        </section>

        {hasInstant ? (
          <section className="card p-6">
            <h2 className="font-extrabold text-ink flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-brand-600" />
              Number to top up
            </h2>
            <p className="text-[13px] text-ink-soft mt-1">
              The Safaricom line that should receive the bundles / airtime.
            </p>
            <input
              className="input mt-3 max-w-xs"
              value={topupPhone}
              onChange={(e) => setTopupPhone(e.target.value)}
              placeholder="e.g. 0712 345 678"
              inputMode="tel"
              autoComplete="tel"
            />
          </section>
        ) : null}

        {hasRouter ? (
          <section className="card p-6">
            <h2 className="font-extrabold text-ink flex items-center gap-2">
              <Router className="w-5 h-5 text-brand-600" />
              Router number
            </h2>
            <p className="text-[13px] text-ink-soft mt-1">
              The serial/router number the package should be loaded onto. You&apos;ll find this printed on the router or in its settings.
            </p>
            <input
              className="input mt-3 max-w-xs"
              value={routerNumber}
              onChange={(e) => setRouterNumber(e.target.value)}
              placeholder="e.g. RTR-4471928"
              autoComplete="off"
            />
          </section>
        ) : null}

        {fulfilment === "DELIVERY" ? (
          <section className="card p-6">
            <h2 className="font-extrabold text-ink">Delivery address</h2>
            <p className="text-[13px] text-ink-soft mt-1">
              Building / estate, street, town. We&apos;ll call to confirm.
            </p>
            <textarea
              className="input mt-3"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Kaptrimo Flats, Ngong Rd, Nairobi"
              autoComplete="street-address"
            />
          </section>
        ) : null}

        <section className="card p-6">
          <h2 className="font-extrabold text-ink">Order notes (optional)</h2>
          <textarea
            className="input mt-3"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything we should know about this order?"
            maxLength={500}
          />
        </section>
      </div>

      {/* Summary */}
      <div className="card p-6 lg:sticky lg:top-24">
        <h2 className="font-extrabold text-ink">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-3 text-sm">
              <span className="text-ink-soft min-w-0">
                <span className="font-semibold text-ink">{i.name}</span>
                <span className="text-ink-mute"> × {i.qty}</span>
              </span>
              <span className="font-bold text-ink shrink-0">{formatKES(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-line flex justify-between items-baseline">
          <span className="font-bold text-ink">Total</span>
          <span className="text-2xl font-extrabold text-ink">{formatKES(subtotal)}</span>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        ) : null}

        <button
          className="btn btn-lg btn-primary w-full mt-5"
          onClick={placeOrder}
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" /> Placing order…
            </>
          ) : (
            "Continue to payment"
          )}
        </button>
        <p className="mt-4 text-[12px] text-ink-mute text-center leading-relaxed">
          You&apos;ll receive an M-Pesa prompt on your phone — enter your PIN to pay securely.
        </p>
      </div>
    </div>
  );
}
