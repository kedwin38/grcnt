"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Flame, ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";
import { useToast } from "./Toast";
import { formatKES } from "@/lib/format";
import { CategoryIcon } from "./categoryIcon";

export type CardProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  imageId?: number | null;
  categoryName: string;
  categoryIcon: string;
  badge?: string | null; // primary attribute value e.g. "30 GB"
  stock?: number | null;
  instant?: boolean;
  requiresRouterNumber?: boolean;
  hotSale?: boolean;
};

export function ProductCard({ product }: { product: CardProduct }) {
  const { add } = useCart();
  const toast = useToast();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock !== null && product.stock !== undefined && product.stock <= 0;
  const savings =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : 0;

  const item = {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    imageId: product.imageId ?? null,
    categoryName: product.categoryName,
    instant: product.instant ?? true,
    requiresRouterNumber: product.requiresRouterNumber ?? false,
  };

  function handleAdd() {
    if (soldOut) return;
    add(item);
    setAdded(true);
    toast.show({
      title: `${product.name} added to cart`,
      description: formatKES(product.price),
      variant: "cart",
      actionHref: "/cart",
      actionLabel: "View cart",
    });
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div className="card card-hover flex flex-col overflow-hidden group">
      <Link
        href={`/product/${product.slug}`}
        className="block relative focus-visible:outline-none overflow-hidden"
        aria-label={product.name}
      >
        {product.hotSale || savings > 0 ? (
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
            {product.hotSale ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 shadow-sm">
                <Flame className="w-3 h-3" /> Hot Sale
              </span>
            ) : null}
            {savings > 0 ? (
              <span className="inline-flex items-center rounded-full bg-brand-600 text-white text-[11px] font-extrabold px-2.5 py-1 shadow-sm">
                Save {formatKES(savings)}
              </span>
            ) : null}
          </div>
        ) : null}
        {product.imageId ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/img/${product.imageId}`}
              alt={product.name}
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/10 transition-colors duration-300 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
              <span className="text-white text-xs font-bold bg-ink/70 backdrop-blur-sm rounded-full px-3 py-1.5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                View details
              </span>
            </div>
          </>
        ) : (
          <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex flex-col items-center justify-center text-white overflow-hidden">
            <div
              className="absolute -right-8 -bottom-10 w-36 h-36 rounded-full bg-white/10"
              aria-hidden="true"
            />
            <CategoryIcon
              name={product.categoryIcon}
              className="w-10 h-10 opacity-80 mb-1.5"
            />
            {product.badge && (
              <span className="text-2xl font-extrabold tracking-tight drop-shadow-sm">
                {product.badge}
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
          {product.categoryName}
        </span>
        <Link
          href={`/product/${product.slug}`}
          className="font-semibold text-[15px] leading-snug text-ink hover:text-brand-700 mt-1 line-clamp-2"
        >
          {product.name}
        </Link>
        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold text-ink">{formatKES(product.price)}</div>
            {product.compareAtPrice && product.compareAtPrice > product.price ? (
              <div className="text-xs text-ink-mute line-through">
                {formatKES(product.compareAtPrice)}
              </div>
            ) : null}
          </div>
          {soldOut ? (
            <span className="badge badge-gray">Sold out</span>
          ) : (
            <button
              onClick={handleAdd}
              className={`btn btn-sm ${
                added ? "bg-brand-700 text-white" : "btn-primary"
              }`}
              aria-label={`Add ${product.name} to cart`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" /> Add
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BuyNowButton({ product }: { product: CardProduct }) {
  const { add } = useCart();
  const router = useRouter();
  return (
    <button
      className="btn btn-lg btn-outline"
      onClick={() => {
        add({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          imageId: product.imageId ?? null,
          categoryName: product.categoryName,
          instant: product.instant ?? true,
          requiresRouterNumber: product.requiresRouterNumber ?? false,
        });
        router.push("/checkout");
      }}
    >
      Buy now
    </button>
  );
}
