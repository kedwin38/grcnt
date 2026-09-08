import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { staffSchema, zodMessage } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const admin = await apiUser();
  if (!admin || admin.role !== "ADMIN") return fail("Admin access required.", 403);

  const body = await readJson(req);
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  const { name, phone, password, role } = parsed.data;
  if (await db.user.findUnique({ where: { phone } })) {
    return fail("An account with this phone number already exists.", 409);
  }

  const user = await db.user.create({
    data: {
      name,
      phone,
      passwordHash: await bcrypt.hash(password, 10),
      role,
    },
  });
  await audit({ id: admin.id, name: admin.name }, "staff.create", "user", user.id, {
    name,
    role,
  });
  return ok({ id: user.id });
}
