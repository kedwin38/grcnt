import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { categorySchema, zodMessage } from "@/lib/validation";
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
  const catId = parseInt(id, 10);
  if (!Number.isInteger(catId)) return fail("Invalid category.", 422);

  const existing = await db.category.findUnique({ where: { id: catId } });
  if (!existing) return fail("Category not found.", 404);

  const body = await readJson(req);
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const input = parsed.data;

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.requiresImage !== undefined) data.requiresImage = input.requiresImage;
  if (input.tracksStock !== undefined) data.tracksStock = input.tracksStock;
  if (input.instantTopup !== undefined) data.instantTopup = input.instantTopup;
  if (input.requiresRouterNumber !== undefined) data.requiresRouterNumber = input.requiresRouterNumber;
  if (input.showOnHome !== undefined) data.showOnHome = input.showOnHome;
  if (input.fields !== undefined) data.fields = JSON.stringify(input.fields);
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.active !== undefined) data.active = input.active;

  const category = await db.category.update({ where: { id: catId }, data });
  await audit({ id: user.id, name: user.name }, "category.update", "category", catId, {
    changed: Object.keys(data),
  });
  return ok({ id: category.id });
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
  const catId = parseInt(id, 10);
  if (!Number.isInteger(catId)) return fail("Invalid category.", 422);

  const products = await db.product.count({ where: { categoryId: catId } });
  if (products > 0) {
    // Products reference it — hide instead of delete
    await db.category.update({ where: { id: catId }, data: { active: false } });
    await audit({ id: user.id, name: user.name }, "category.hide", "category", catId, {
      reason: `has ${products} products`,
    });
    return ok({ hidden: true, products });
  }

  await db.category.delete({ where: { id: catId } });
  await audit({ id: user.id, name: user.name }, "category.delete", "category", catId);
  return ok({ deleted: true });
}
