import { NextRequest } from "next/server";
import { ok, assertCsrf } from "@/lib/api";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const session = await getSession();
  session.destroy();
  return ok({ loggedOut: true });
}
