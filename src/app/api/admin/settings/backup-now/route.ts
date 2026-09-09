import { NextRequest } from "next/server";
import { ok, fail, assertCsrf } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { runBackup } from "@/lib/backup";

// Manually triggers an immediate off-site backup — also the easiest way to
// confirm bucket/credentials are correct before trusting the schedule.
export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  try {
    const { key, size } = await runBackup();
    return ok({
      message: `Backup uploaded: ${key} (${(size / 1024).toFixed(0)} KB).`,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Backup failed.", 502);
  }
}
