import { NextRequest } from "next/server";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { paymentAccountSchema, zodMessage } from "@/lib/validation";
import { createPaymentAccount } from "@/lib/payment-accounts";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  const body = await readJson(req);
  const parsed = paymentAccountSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const input = parsed.data;

  if (!input.consumerKey || !input.consumerSecret || !input.passkey) {
    return fail("Fill in consumer key, consumer secret and passkey.", 422);
  }
  if (input.transactionType === "CustomerBuyGoodsOnline" && !input.tillNumber) {
    return fail("Buy Goods needs a till number, separate from the shortcode.", 422);
  }

  const account = await createPaymentAccount(input);
  await audit({ id: user.id, name: user.name }, "payment_account.create", "payment_account", account.id, {
    label: account.label,
  });
  return ok({ id: account.id });
}
