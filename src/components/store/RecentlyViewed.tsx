"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { formatKES } from "@/lib/format";
import { CategoryIcon } from "./categoryIcon";

export type ViewedProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageId: number | null;
  categoryIcon: string;
};

const STORAGE_KEY = "gcn_recently_viewed";
const MAX_ENTRIES = 8;

// Records the current product into localStorage, then renders the other
// recently viewed ones — a per-browser convenience (mere-exposure /
// continuity of browsing) that never leaves the visitor's device.
export function RecentlyViewed({ current }: { current: ViewedProduct }) {
  const [others, setOthers] = useState<ViewedProduct[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const list: ViewedProduct[] = raw ? JSON.parse(raw) : [];
      const withoutCurrent = list.filter((p) => p.id !== current.id);
      setOthers(withoutCurrent.slice(0, 6));
      const updated = [current, ...withoutCurrent].slice(0, MAX_ENTRIES);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Private browsing / blocked storage — just skip the strip.
    }
    // Only re-run if the viewed product itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  if (others.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
      <div className="flex items-center gap-2 mb-5">
        <History className="w-4.5 h-4.5 text-brand-600" />
        <h2 className="font-extrabold text-lg text-ink tracking-tight">Recently viewed</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {others.map((p) => (
          <Link
            key={p.id}
            href={`/product/${p.slug}`}
            className="card card-hover shrink-0 w-40 overflow-hidden group"
          >
            {p.imageId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/img/${p.imageId}`}
                alt={p.name}
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="aspect-square w-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <CategoryIcon name={p.categoryIcon} className="w-8 h-8 text-white/80" />
              </div>
            )}
            <div className="p-3">
              <div className="text-[13px] font-semibold text-ink line-clamp-2 leading-snug">{p.name}</div>
              <div className="text-sm font-extrabold text-ink mt-1">{formatKES(p.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
