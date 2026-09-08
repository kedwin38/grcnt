import { NextRequest } from "next/server";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { getDarajaToken, stkPush, isSimulated } from "@/lib/daraja";
import { getSettingGroup } from "@/lib/settings";
import { z } from "zod";
import { normalizePhone } from "@/lib/format";

const testSchema = z.object({
  phone: z.string().optional(),
  amount: z.number().int().min(1).max(200).optional(),
});

// Verifies Daraja credentials (OAuth) and optionally sends a real KSh 1 test
// STK push — the surest way to confirm till configuration end to end.
export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  if (isSimulated()) {
    return ok({
      tokenOk: true,
      simulated: true,
      message:
        "Demo mode (MPESA_SIMULATE=true): real Daraja calls are skipped. Set MPESA_SIMULATE=false and configure credentials to test live.",
    });
  }

  const cfg = await getSettingGroup("mpesa");
  if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.passkey) {
    return fail("Fill in consumer key, consumer secret and passkey first, then save.", 422);
  }

  try {
    await getDarajaToken(true);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not authenticate with Daraja.", 502);
  }

  const body = await readJson(req);
  const parsed = testSchema.safeParse(body || {});
  const phone = parsed.success && parsed.data.phone ? normalizePhone(parsed.data.phone) : null;

  if (parsed.success && phone) {
    try {
      const res = await stkPush({
        amount: 1,
        phone,
        accountReference: "TEST",
        description: "Credential test",
        callbackUrl: `${cfg.callbackBaseUrl || ""}/api/mpesa/callback`,
      });
      return ok({
        tokenOk: true,
        stkOk: true,
        message: `Test STK push sent to ${phone}. If it arrived, your till + passkey + callback are all working. (Ref: ${res.CheckoutRequestID})`,
      });
    } catch (err) {
      return fail(
        `Credentials OK, but the test STK push failed: ${err instanceof Error ? err.message : "unknown error"}`,
        502
      );
    }
  }

  return ok({
    tokenOk: true,
    message: "Daraja credentials are correct — OAuth token received. Use “Send KSh 1 test push” to fully verify the till.",
  });
}
