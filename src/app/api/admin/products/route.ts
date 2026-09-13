import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { productSchema, zodMessage } from "@/lib/validation";
import { slugify } from "@/lib/format";
import { audit } from "@/lib/audit";

async function requireStaffUser() {
  const user = await apiUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await requireStaffUser();
  if (!user) return fail("Staff access required.", 403);

  const body = await readJson(req);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const input = parsed.data;

  const category = await db.category.findUnique({ where: { id: input.categoryId } });
  if (!category) return fail("Category not found.", 422);

  // Base slug, de-duplicated with a short suffix on conflict
  let slug = slugify(input.name);
  if (await db.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const product = await db.product.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      slug,
      description: input.description || null,
      price: input.price,
      compareAtPrice: input.compareAtPrice || null,
      images: JSON.stringify(input.images),
      attributes: JSON.stringify(input.attributes),
      stock: category.tracksStock ? (input.stock ?? 0) : null,
      lowStockAt: input.lowStockAt,
      active: input.active,
      featured: input.featured,
      hotSale: input.hotSale,
      sortOrder: input.sortOrder,
    },
  });

  await audit({ id: user.id, name: user.name }, "product.create", "product", product.id, {
    name: product.name,
    price: product.price,
  });
  return ok({ id: product.id, slug: product.slug });
}
