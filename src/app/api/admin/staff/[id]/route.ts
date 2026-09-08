import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { audit } from "@/lib/audit";

const patchSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(["STAFF", "ADMIN"]).optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const admin = await apiUser();
  if (!admin || admin.role !== "ADMIN") return fail("Admin access required.", 403);

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (!Number.isInteger(userId)) return fail("Invalid staff member.", 422);

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "CUSTOMER") return fail("Staff member not found.", 404);

  const body = await readJson(req);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid input.", 422);

  // Guard rails on the last active admin
  if (
    (parsed.data.active === false || parsed.data.role === "STAFF") &&
    target.role === "ADMIN" &&
    target.active
  ) {
    const activeAdmins = await db.user.count({
      where: { role: "ADMIN", active: true },
    });
    if (activeAdmins <= 1) {
      return fail("You can't remove the last active admin. Promote someone else first.", 409);
    }
  }
  if (target.id === admin.id && parsed.data.active === false) {
    return fail("You can't deactivate your own account.", 409);
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.newPassword) {
    data.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  }

  await db.user.update({ where: { id: userId }, data });
  await audit({ id: admin.id, name: admin.name }, "staff.update", "user", userId, {
    changed: Object.keys(data),
  });
  return ok({ updated: true });
}
