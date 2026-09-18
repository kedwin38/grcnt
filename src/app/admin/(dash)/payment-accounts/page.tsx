import { requireAdmin } from "@/lib/session";
import { listPaymentAccounts } from "@/lib/payment-accounts";
import { PaymentAccountsManager } from "./PaymentAccountsManager";

export default async function PaymentAccountsPage() {
  await requireAdmin();
  const accounts = await listPaymentAccounts();

  // Suggest the callback origin from the current request, same idea as the
  // old single-till settings page — just a starting point for new accounts.
  const headers = await import("next/headers").then((m) => m.headers());
  const host = headers.get("x-forwarded-host") || headers.get("host") || "";
  const proto = headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const suggestedCallback = host ? `${proto}://${host}` : "";

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Payment accounts</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          Add a Daraja till/paybill for each business account you settle payments
          to. Assign products to a specific account under Admin → Products —
          products left unassigned use whichever account is marked Default.
        </p>
      </div>
      <PaymentAccountsManager initial={accounts} suggestedCallback={suggestedCallback} />
    </div>
  );
}
