import { NextRequest } from "next/server";
import { ok, fail, assertCsrf } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { setDefaultPaymentAccount } from "@/lib/payment-accounts";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (!Number.isInteger(accountId)) return fail("Invalid account.", 422);

  const account = await db.paymentAccount.findUnique({ where: { id: accountId } });
  if (!account) return fail("Payment account not found.", 404);

  await setDefaultPaymentAccount(accountId);
  await audit({ id: user.id, name: user.name }, "payment_account.set_default", "payment_account", accountId, {
    label: account.label,
  });
  return ok({ id: accountId });
}
