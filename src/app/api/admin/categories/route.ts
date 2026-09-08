import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { categorySchema, zodMessage } from "@/lib/validation";
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
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const input = parsed.data;

  let slug = input.slug || slugify(input.name);
  if (await db.category.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
  }

  const category = await db.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description || null,
      icon: input.icon,
      requiresImage: input.requiresImage,
      tracksStock: input.tracksStock,
      instantTopup: input.instantTopup,
      fields: JSON.stringify(input.fields),
      sortOrder: input.sortOrder,
      active: input.active,
    },
  });
  await audit({ id: user.id, name: user.name }, "category.create", "category", category.id, {
    name: category.name,
  });
  return ok({ id: category.id });
}
