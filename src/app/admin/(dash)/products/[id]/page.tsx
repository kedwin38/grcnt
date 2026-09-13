import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { parseAttributes, parseFields, parseImages } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const productId = parseInt(id, 10);
  if (!Number.isInteger(productId)) notFound();

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      include: { category: true },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  const attrs = parseAttributes(product);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/products" className="text-[13px] font-semibold text-brand-700 hover:underline">
            ← Products
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">{product.name}</h1>
          <p className="text-ink-soft text-sm mt-0.5">/product/{product.slug}</p>
        </div>
        <Link href={`/product/${product.slug}`} target="_blank" className="btn btn-md btn-outline">
          View on store ↗
        </Link>
      </div>

      <ProductForm
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          requiresImage: c.requiresImage,
          tracksStock: c.tracksStock,
          instantTopup: c.instantTopup,
          fields: parseFields(c),
        }))}
        initial={{
          id: product.id,
          categoryId: product.categoryId,
          name: product.name,
          description: product.description || "",
          price: String(product.price),
          compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "",
          images: parseImages(product).map((i) => ({ id: i.id })),
          attributes: Object.fromEntries(
            Object.entries(attrs).map(([k, v]) => [k, String(v)])
          ),
          stock: product.stock === null ? "" : String(product.stock),
          lowStockAt: String(product.lowStockAt),
          active: product.active,
          featured: product.featured,
          hotSale: product.hotSale,
          sortOrder: String(product.sortOrder),
        }}
      />
    </div>
  );
}
