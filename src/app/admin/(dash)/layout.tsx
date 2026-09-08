import { requireStaff } from "@/lib/session";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return <AdminShell user={{ name: user.name, role: user.role }}>{children}</AdminShell>;
}
