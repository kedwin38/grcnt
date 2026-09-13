import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { productSchema, zodMessage } from "@/lib/validation";
import { audit } from "@/lib/audit";

async function requireStaffUser() {
  const user = await apiUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await requireStaffUser();
  if (!user) return fail("Staff access required.", 403);

  const { id } = await params;
  const productId = parseInt(id, 10);
  if (!Number.isInteger(productId)) return fail("Invalid product.", 422);

  const existing = await db.product.findUnique({ where: { id: productId } });
  if (!existing) return fail("Product not found.", 404);

  const body = await readJson(req);
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const input = parsed.data;

  let tracksStock = existing.stock !== null;
  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await db.category.findUnique({ where: { id: input.categoryId } });
    if (!category) return fail("Category not found.", 422);
    tracksStock = category.tracksStock;
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.price !== undefined) data.price = input.price;
  if (input.compareAtPrice !== undefined) data.compareAtPrice = input.compareAtPrice || null;
  if (input.images !== undefined) data.images = JSON.stringify(input.images);
  if (input.attributes !== undefined) data.attributes = JSON.stringify(input.attributes);
  if (input.stock !== undefined) data.stock = tracksStock ? input.stock : null;
  if (input.lowStockAt !== undefined) data.lowStockAt = input.lowStockAt;
  if (input.active !== undefined) data.active = input.active;
  if (input.featured !== undefined) data.featured = input.featured;
  if (input.hotSale !== undefined) data.hotSale = input.hotSale;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;

  const product = await db.product.update({ where: { id: productId }, data });
  await audit({ id: user.id, name: user.name }, "product.update", "product", productId, {
    changed: Object.keys(data),
  });
  return ok({ id: product.id });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await requireStaffUser();
  if (!user) return fail("Staff access required.", 403);

  const { id } = await params;
  const productId = parseInt(id, 10);
  if (!Number.isInteger(productId)) return fail("Invalid product.", 422);

  const orderItems = await db.orderItem.count({ where: { productId } });
  if (orderItems > 0) {
    // Keep history intact — archive instead of hard delete
    await db.product.update({ where: { id: productId }, data: { active: false } });
    await audit({ id: user.id, name: user.name }, "product.archive", "product", productId, {
      reason: "has order history",
    });
    return ok({ archived: true });
  }

  const product = await db.product.delete({ where: { id: productId } });
  await audit({ id: user.id, name: user.name }, "product.delete", "product", productId, {
    name: product.name,
  });
  return ok({ deleted: true });
}
