import { requireAdmin } from "@/lib/session";
import { getAllSettings, maskSecret } from "@/lib/settings";
import { db } from "@/lib/db";
import { SettingsTabs } from "./SettingsTabs";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getAllSettings();
  const imageCount = await db.imageAsset.count();

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          Business details, SEO and backups — editable here, no code required.
          Sensitive values are encrypted in the database and masked on screen.
          M-Pesa credentials now live under Payment Accounts.
        </p>
      </div>

      <SettingsTabs
        initialBusiness={settings.business}
        initialSeo={settings.seo}
        initialBackup={{ ...settings.backup, secretAccessKey: maskSecret(settings.backup.secretAccessKey) }}
        imageCount={imageCount}
      />
    </div>
  );
}
