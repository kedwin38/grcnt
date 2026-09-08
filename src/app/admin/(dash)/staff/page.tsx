import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { prettyPhone, formatDateTime } from "@/lib/format";
import { StaffManager } from "./StaffManager";

export default async function AdminStaffPage() {
  const admin = await requireAdmin();
  const staff = await db.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN"] } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Staff</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          Staff can manage orders, products, categories and support. Only admins
          (like you) can change settings, credentials and staff accounts.
        </p>
      </div>
      <StaffManager
        currentAdminId={admin.id}
        staff={staff.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          role: s.role as "STAFF" | "ADMIN",
          active: s.active,
          createdAt: formatDateTime(s.createdAt),
        }))}
      />
    </div>
  );
}
