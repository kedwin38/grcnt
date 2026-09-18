import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { stkQuery, DARAJA_TERMINAL_FAILURE_CODES } from "@/lib/daraja";
import { getPaymentAccount, PaymentAccountError } from "@/lib/payment-accounts";

// Human-readable take on the confirmed terminal codes — these are real
// customer-side outcomes, not necessarily configuration problems, so the
// message shouldn't point the admin at their till setup for all of them.
function describeTerminalFailure(code: string, desc: string): string {
  switch (code) {
    case "1032":
      return `The prompt reached the phone but was cancelled (no PIN entered) — "${desc}". That's actually a good sign: your till, passkey and callback are working. Try again and enter the PIN this time to fully confirm.`;
    case "1":
      return `The prompt reached the phone but the M-Pesa balance was too low to complete it — "${desc}". This confirms your till, passkey and callback are working; top up and retry, or treat this as passed.`;
    case "1037":
      return `Daraja couldn't get a response from the phone in time — "${desc}". If you didn't see a prompt at all, double-check the phone number and try again; a single timeout isn't necessarily a configuration problem.`;
    case "2001":
      return `Daraja rejected the request — "${desc}". This can mean a wrong PIN was entered, or that the shortcode/passkey pair is mismatched. If you didn't get a prompt at all, check this account's settings.`;
    default:
      return `Daraja reported a failure — "${desc}" (code ${code}).`;
  }
}

// One check per call — the admin UI polls this every few seconds for as
// long as it likes rather than a single request blocking (and eventually
// giving up) while waiting on the admin to enter their PIN.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  const { id } = await params;
  const accountId = parseInt(id, 10);
  const checkoutRequestId = req.nextUrl.searchParams.get("checkoutRequestId");
  if (!Number.isInteger(accountId) || !checkoutRequestId) return fail("Invalid request.", 422);

  let cfg;
  try {
    cfg = await getPaymentAccount(accountId);
  } catch (err) {
    if (err instanceof PaymentAccountError) return fail(err.message, 422);
    throw err;
  }

  try {
    const result = await stkQuery(cfg, checkoutRequestId);
    const rc = String(result.ResultCode ?? result.ResponseCode ?? "");
    if (rc === "0") {
      return ok({
        status: "SUCCESS",
        message: `Confirmed: the push completed successfully (Ref: ${checkoutRequestId}). This account's till, passkey and callback are all working.`,
      });
    }
    if (rc && DARAJA_TERMINAL_FAILURE_CODES.has(rc)) {
      return ok({
        status: "FAILED",
        message: `${describeTerminalFailure(rc, result.ResultDesc || "unknown result")} (Ref: ${checkoutRequestId})`,
      });
    }
  } catch {
    /* not answerable yet — report pending, try again shortly */
  }
  return ok({ status: "PENDING" });
}
