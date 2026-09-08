import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import { toCardProduct } from "@/lib/catalog";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryIcon } from "@/components/store/categoryIcon";

export const metadata: Metadata = {
  title: "Shop — data bundles, airtime, minutes & phones",
  description:
    "Browse genuine Safaricom data bundles, airtime, minutes packages, phones and accessories. Pay with M-Pesa, get instant top-ups.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { cat, q } = await searchParams;

  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const activeCat = cat ? categories.find((c) => c.slug === cat) : undefined;
  const search = (q || "").trim();

  const products = await db.product.findMany({
    where: {
      active: true,
      ...(activeCat ? { categoryId: activeCat.id } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { price: "asc" }],
    take: 60,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="section-eyebrow">Shop</div>
          <h1 className="section-title mt-1">
            {activeCat ? activeCat.name : search ? `Results for “${search}”` : "All products"}
          </h1>
          <p className="text-ink-soft mt-1.5 text-[15px]">
            {activeCat?.description ||
              "Genuine Safaricom products with secure M-Pesa payment and instant delivery on top-ups."}
          </p>
        </div>

        <form action="/shop" method="GET" className="flex gap-2" role="search">
          {cat ? <input type="hidden" name="cat" value={cat} /> : null}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search products…"
              className="input pl-10 w-56 sm:w-72"
              aria-label="Search products"
            />
          </div>
          <button className="btn btn-md btn-primary" type="submit">
            Search
          </button>
        </form>
      </div>

      {/* Category filter pills */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="tablist" aria-label="Categories">
        <SlidersHorizontal className="w-4 h-4 text-ink-mute shrink-0" aria-hidden="true" />
        <Link
          href={search ? `/shop?q=${encodeURIComponent(search)}` : "/shop"}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
            !activeCat
              ? "bg-brand-500 text-white border-brand-500"
              : "bg-surface border-line text-ink-soft hover:border-brand-400 hover:text-brand-700"
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop?cat=${c.slug}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              activeCat?.id === c.id
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-surface border-line text-ink-soft hover:border-brand-400 hover:text-brand-700"
            }`}
          >
            <CategoryIcon name={c.icon} className="w-3.5 h-3.5" />
            {c.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="card mt-8 p-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center">
            <Search className="w-7 h-7 text-brand-500" />
          </div>
          <h2 className="mt-4 font-extrabold text-lg text-ink">Nothing found</h2>
          <p className="text-ink-soft text-sm mt-1">
            Try a different search or browse all products.
          </p>
          <Link href="/shop" className="btn btn-md btn-primary mt-5">
            Browse all products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={toCardProduct(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
