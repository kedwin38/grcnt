import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { parseFields } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await requireStaff();
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <Link href="/admin/products" className="text-[13px] font-semibold text-brand-700 hover:underline">
          ← Products
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">New product</h1>
      </div>
      {categories.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-soft">
            Create a category first — categories define what fields products have.
          </p>
          <Link href="/admin/categories" className="btn btn-md btn-primary mt-4">
            Go to categories
          </Link>
        </div>
      ) : (
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
        />
      )}
    </div>
  );
}
