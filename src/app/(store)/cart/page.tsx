"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/components/store/CartProvider";
import { formatKES } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, setQty, remove, count } = useCart();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <h1 className="section-title">Your cart</h1>
      <p className="text-ink-soft mt-1">
        {count === 0 ? "Your cart is empty." : `${count} item${count === 1 ? "" : "s"} ready for checkout`}
      </p>

      {items.length === 0 ? (
        <div className="card mt-8 p-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center">
            <ShoppingCart className="w-7 h-7 text-brand-500" />
          </div>
          <h2 className="mt-4 font-extrabold text-lg">Nothing here yet</h2>
          <p className="text-ink-soft text-sm mt-1">
            Browse our bundles, airtime and phones — top-ups are delivered instantly.
          </p>
          <Link href="/shop" className="btn btn-lg btn-primary mt-5">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="card divide-y divide-line overflow-hidden">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 p-4">
                {item.imageId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/img/${item.imageId}`}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border border-line"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-extrabold px-1 text-center">
                    {item.categoryName}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.slug}`}
                    className="font-semibold text-[15px] text-ink hover:text-brand-700 line-clamp-1"
                  >
                    {item.name}
                  </Link>
                  <div className="text-xs text-ink-mute mt-0.5">{formatKES(item.price)} each</div>
                </div>
                <div className="flex items-center rounded-xl border border-line h-10 shrink-0">
                  <button
                    className="w-9 h-10 flex items-center justify-center text-ink-soft hover:text-brand-700"
                    onClick={() => setQty(item.productId, item.qty - 1)}
                    aria-label={`Reduce ${item.name}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm">{item.qty}</span>
                  <button
                    className="w-9 h-10 flex items-center justify-center text-ink-soft hover:text-brand-700"
                    onClick={() => setQty(item.productId, item.qty + 1)}
                    aria-label={`Add another ${item.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-24 text-right font-extrabold text-ink shrink-0">
                  {formatKES(item.price * item.qty)}
                </div>
                <button
                  className="text-ink-mute hover:text-red-600 transition-colors shrink-0"
                  onClick={() => remove(item.productId)}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="card p-6 lg:sticky lg:top-24">
            <h2 className="font-extrabold text-ink">Summary</h2>
            <div className="mt-4 flex justify-between text-ink-soft text-sm">
              <span>Subtotal</span>
              <span className="font-semibold text-ink">{formatKES(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-ink-soft text-sm">
              <span>Delivery</span>
              <span className="font-semibold text-ink">Chosen at checkout</span>
            </div>
            <div className="mt-4 pt-4 border-t border-line flex justify-between items-baseline">
              <span className="font-bold text-ink">Total</span>
              <span className="text-2xl font-extrabold text-ink">{formatKES(subtotal)}</span>
            </div>
            <Link href="/checkout" className="btn btn-lg btn-primary w-full mt-6">
              Proceed to checkout
            </Link>
            <Link href="/shop" className="btn btn-lg btn-ghost w-full mt-2">
              Continue shopping
            </Link>
            <p className="mt-4 text-[12px] text-ink-mute text-center leading-relaxed">
              Secure M-Pesa payment — you&apos;ll confirm with your PIN on your phone.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
