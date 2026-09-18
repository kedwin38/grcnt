import { requireStaff } from "@/lib/session";
import { SecurityManager } from "./SecurityManager";

export default async function SecurityPage() {
  const staff = await requireStaff();

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">My security</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          Two-factor authentication for your own back-office login.
        </p>
      </div>
      <SecurityManager totpEnabled={staff.totpEnabled} />
    </div>
  );
}
