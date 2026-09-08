import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { apiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return fail("Staff access required.", 403);
  }
  const newCount = await db.supportTicket.count({ where: { status: "NEW" } });
  return ok({ newCount });
}
