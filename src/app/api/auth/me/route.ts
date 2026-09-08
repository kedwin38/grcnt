import { ok } from "@/lib/api";
import { apiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await apiUser();
  if (!user) return ok(null);
  return ok({ name: user.name, phone: user.phone, email: user.email, role: user.role });
}
