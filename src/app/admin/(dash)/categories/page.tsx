import { requireStaff } from "@/lib/session";
import { db } from "@/lib/db";
import { parseFields } from "@/lib/catalog";
import { CategoriesManager } from "./CategoriesManager";

export default async function AdminCategoriesPage() {
  await requireStaff();
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Categories</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          Categories shape the whole shop — define what each one sells, whether
          products need photos, and which details (size, validity…) each product has.
        </p>
      </div>
      <CategoriesManager
        initial={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || "",
          icon: c.icon,
          requiresImage: c.requiresImage,
          tracksStock: c.tracksStock,
          instantTopup: c.instantTopup,
          requiresRouterNumber: c.requiresRouterNumber,
          fields: parseFields(c).map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            unit: f.unit || "",
            options: (f.options || []).join(", "),
            badge: !!f.badge,
          })),
          sortOrder: c.sortOrder,
          active: c.active,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
