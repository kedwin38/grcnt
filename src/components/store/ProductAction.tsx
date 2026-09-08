"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "./CartProvider";
import type { CardProduct } from "./ProductCard";
import { useRouter } from "next/navigation";

export function ProductAction({ product }: { product: CardProduct }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = product.stock !== null && product.stock !== undefined && product.stock <= 0;

  const item = {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    imageId: product.imageId ?? null,
    categoryName: product.categoryName,
    instant: product.instant ?? true,
  };

  if (soldOut) {
    return (
      <div className="mt-6">
        <button disabled className="btn btn-lg btn-primary w-full sm:w-auto sm:min-w-64">
          Sold out
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-xl border border-line bg-surface h-12">
        <button
          className="w-11 h-12 flex items-center justify-center text-ink-soft hover:text-brand-700 disabled:opacity-40"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-10 text-center font-bold text-ink" aria-live="polite">
          {qty}
        </span>
        <button
          className="w-11 h-12 flex items-center justify-center text-ink-soft hover:text-brand-700"
          onClick={() => setQty((q) => Math.min(20, q + 1))}
          aria-label="Increase quantity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <button
        className={`btn btn-lg flex-1 sm:flex-none sm:min-w-44 ${
          added ? "bg-brand-700" : "btn-primary"
        }`}
        onClick={() => {
          add(item, qty);
          setAdded(true);
          setTimeout(() => setAdded(false), 1400);
        }}
      >
        <ShoppingCart className="w-4.5 h-4.5" />
        {added ? "Added to cart" : "Add to cart"}
      </button>

      <button
        className="btn btn-lg btn-outline flex-1 sm:flex-none"
        onClick={() => {
          add(item, qty);
          router.push("/checkout");
        }}
      >
        <Zap className="w-4.5 h-4.5" /> Buy now
      </button>
    </div>
  );
}
