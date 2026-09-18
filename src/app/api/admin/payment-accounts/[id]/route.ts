import { NextRequest } from "next/server";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { paymentAccountSchema, zodMessage } from "@/lib/validation";
import { updatePaymentAccount, deletePaymentAccount } from "@/lib/payment-accounts";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function PATCH(
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

  const existing = await db.paymentAccount.findUnique({ where: { id: accountId } });
  if (!existing) return fail("Payment account not found.", 404);

  const body = await readJson(req);
  const parsed = paymentAccountSchema.partial().safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const input = parsed.data;

  const transactionType = input.transactionType ?? existing.transactionType;
  const tillNumber = input.tillNumber ?? existing.tillNumber ?? "";
  if (transactionType === "CustomerBuyGoodsOnline" && !tillNumber) {
    return fail("Buy Goods needs a till number, separate from the shortcode.", 422);
  }

  await updatePaymentAccount(accountId, input);
  await audit({ id: user.id, name: user.name }, "payment_account.update", "payment_account", accountId, {
    changed: Object.keys(input),
  });
  return ok({ id: accountId });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertCsrf(_req);
  if (csrf) return csrf;
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (!Number.isInteger(accountId)) return fail("Invalid account.", 422);

  const result = await deletePaymentAccount(accountId);
  if (!result.deleted && !result.hidden) {
    return fail(result.reason || "Could not delete this account.", 409);
  }
  await audit(
    { id: user.id, name: user.name },
    result.deleted ? "payment_account.delete" : "payment_account.hide",
    "payment_account",
    accountId,
    { reason: result.reason }
  );
  return ok(result);
}
