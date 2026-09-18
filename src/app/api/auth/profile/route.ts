import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import {
  profileSchema,
  changePasswordSchema,
  zodMessage,
} from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await apiUser();
  if (!user) return fail("Please log in.", 401);

  const body = await readJson(req);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  const data: { name: string; email: string | null; phone?: string } = {
    name: parsed.data.name,
    email: parsed.data.email || null,
  };
  if (parsed.data.phone) {
    const existing = await db.user.findUnique({ where: { phone: parsed.data.phone } });
    if (existing && existing.id !== user.id) {
      return fail("That phone number is already linked to another account.", 409);
    }
    data.phone = parsed.data.phone;
  }

  await db.user.update({ where: { id: user.id }, data });
  await audit({ id: user.id, name: user.name }, "profile.update", "user", user.id);
  return ok({ updated: true });
}

export async function PUT(req: NextRequest) {
  // Change password
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await apiUser();
  if (!user) return fail("Please log in.", 401);

  const body = await readJson(req);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  if (user.passwordHash) {
    if (!parsed.data.currentPassword) return fail("Enter your current password.", 422);
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) return fail("Your current password is incorrect.", 403);
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  await audit({ id: user.id, name: user.name }, "profile.password_change", "user", user.id);
  return ok({ updated: true });
}
