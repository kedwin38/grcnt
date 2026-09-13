import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatKES } from "@/lib/format";
import { parseImages } from "@/lib/catalog";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; filter?: string }>;
}) {
  await requireStaff();
  const { cat, q, filter } = await searchParams;
  const search = (q || "").trim();

  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
  const activeCat = cat ? categories.find((c) => c.slug === cat) : undefined;

  const products = await db.product.findMany({
    where: {
      ...(activeCat ? { categoryId: activeCat.id } : {}),
      ...(search ? { name: { contains: search } } : {}),
      ...(filter === "low"
        ? { stock: { not: null, lte: db.product.fields.lowStockAt } }
        : filter === "inactive"
          ? { active: false }
          : {}),
    },
    include: { category: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    take: 100,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Products</h1>
          <p className="text-ink-soft text-sm mt-0.5">
            Bundles, airtime, phones — everything on the shelf.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn-md btn-primary">
          <Plus className="w-4 h-4" /> New product
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <form action="/admin/products" method="GET" className="flex gap-2">
          {cat ? <input type="hidden" name="cat" value={cat} /> : null}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
            <input name="q" defaultValue={search} className="input pl-9 w-56" placeholder="Search products…" />
          </div>
          <button className="btn btn-md btn-outline">Search</button>
        </form>
        <div className="flex gap-1.5 flex-wrap">
          <Link href="/admin/products" className={`px-3.5 py-2 rounded-full text-[13px] font-bold border ${!activeCat && !filter ? "bg-brand-500 text-white border-brand-500" : "bg-surface border-line text-ink-soft hover:border-brand-300"}`}>
            All
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/admin/products?cat=${c.slug}`} className={`px-3.5 py-2 rounded-full text-[13px] font-bold border ${activeCat?.id === c.id ? "bg-brand-500 text-white border-brand-500" : "bg-surface border-line text-ink-soft hover:border-brand-300"}`}>
              {c.name}
            </Link>
          ))}
          <Link href="/admin/products?filter=low" className={`px-3.5 py-2 rounded-full text-[13px] font-bold border ${filter === "low" ? "bg-red-500 text-white border-red-500" : "bg-surface border-line text-ink-soft hover:border-red-300"}`}>
            Low stock
          </Link>
          <Link href="/admin/products?filter=inactive" className={`px-3.5 py-2 rounded-full text-[13px] font-bold border ${filter === "inactive" ? "bg-slate-600 text-white border-slate-600" : "bg-surface border-line text-ink-soft hover:border-slate-300"}`}>
            Hidden
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-paper">
              <tr>
                <th className="th">Product</th>
                <th className="th">Category</th>
                <th className="th text-right">Price</th>
                <th className="th text-center">Stock</th>
                <th className="th text-center">Visible</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td text-center py-10 text-ink-mute">
                    No products here yet.{" "}
                    <Link href="/admin/products/new" className="text-brand-700 font-bold underline">
                      Add the first one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const cover = parseImages(p)[0];
                  const low = p.stock !== null && p.stock <= p.lowStockAt;
                  return (
                    <tr key={p.id} className={`hover:bg-brand-50/40 ${p.active ? "" : "opacity-60"}`}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/api/img/${cover.id}`} alt="" className="w-11 h-11 rounded-xl object-cover border border-line" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700" />
                          )}
                          <div className="min-w-0">
                            <Link href={`/admin/products/${p.id}`} className="font-bold text-ink hover:text-brand-700 line-clamp-1">
                              {p.name}
                            </Link>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {p.featured ? <span className="badge badge-amber">Featured</span> : null}
                              {p.hotSale ? <span className="badge badge-red">🔥 Hot Sale</span> : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="td text-[13px]">{p.category.name}</td>
                      <td className="td text-right font-extrabold text-ink">
                        {formatKES(p.price)}
                        {p.compareAtPrice ? (
                          <div className="text-[11px] text-ink-mute line-through font-semibold">
                            {formatKES(p.compareAtPrice)}
                          </div>
                        ) : null}
                      </td>
                      <td className="td text-center">
                        {p.stock === null ? (
                          <span className="badge badge-gray">Digital</span>
                        ) : (
                          <span className={`badge ${low ? "badge-red" : p.stock < 10 ? "badge-amber" : "badge-green"}`}>
                            {p.stock}
                          </span>
                        )}
                      </td>
                      <td className="td text-center">
                        {p.active ? (
                          <span className="badge badge-green">Live</span>
                        ) : (
                          <span className="badge badge-gray">Hidden</span>
                        )}
                      </td>
                      <td className="td text-right">
                        <Link href={`/admin/products/${p.id}`} className="btn btn-sm btn-outline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
