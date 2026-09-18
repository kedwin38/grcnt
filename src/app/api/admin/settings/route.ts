import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import {
  businessSettingsSchema,
  seoSettingsSchema,
  backupSettingsSchema,
  zodMessage,
} from "@/lib/validation";
import { saveSettingGroup, type AllSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

const SCHEMAS = {
  business: businessSettingsSchema,
  seo: seoSettingsSchema,
  backup: backupSettingsSchema,
} as const;

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  const body = await readJson<{ group?: string; patch?: Record<string, unknown> }>(req);
  if (!body?.group || !(body.group in SCHEMAS)) return fail("Unknown settings group.", 422);

  const group = body.group as keyof typeof SCHEMAS;
  const parsed = SCHEMAS[group].safeParse(body.patch);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  const patch = { ...parsed.data } as Record<string, unknown>;

  // Write-only secrets: empty string means "keep existing value"
  if (group === "backup" && !patch.secretAccessKey) {
    delete patch.secretAccessKey;
  }

  await saveSettingGroup(group, patch as never);
  await audit({ id: user.id, name: user.name }, "settings.update", "settings", group, {
    changed: Object.keys(patch),
  });
  return ok({ saved: true });
}

export async function GET() {
  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);
  const { getSettingGroup, maskSecret } = await import("@/lib/settings");
  const [business, seo, backup] = await Promise.all([
    getSettingGroup("business"),
    getSettingGroup("seo"),
    getSettingGroup("backup"),
  ]);
  const masked: AllSettings = {
    business,
    seo,
    backup: { ...backup, secretAccessKey: maskSecret(backup.secretAccessKey) },
  };
  return ok(masked);
}
