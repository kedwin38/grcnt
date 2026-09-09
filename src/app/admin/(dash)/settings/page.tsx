import { requireAdmin } from "@/lib/session";
import { getAllSettings, maskSecret } from "@/lib/settings";
import { db } from "@/lib/db";
import { SettingsTabs } from "./SettingsTabs";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const settings = await getAllSettings();

  // Suggest the callback origin from the current request
  const headers = await import("next/headers").then((m) => m.headers());
  const host = headers.get("x-forwarded-host") || headers.get("host") || "";
  const proto = headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

  const imageCount = await db.imageAsset.count();

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-ink-soft text-sm mt-0.5">
          Everything the shop needs — business details, M-Pesa credentials, SEO —
          editable here, no code required. Sensitive values are encrypted in the
          database and masked on screen.
        </p>
      </div>

      <SettingsTabs
        initialBusiness={settings.business}
        initialMpesa={{
          environment: settings.mpesa.environment,
          consumerKey: settings.mpesa.consumerKey,
          consumerSecret: maskSecret(settings.mpesa.consumerSecret),
          passkey: maskSecret(settings.mpesa.passkey),
          shortcode: settings.mpesa.shortcode,
          transactionType: settings.mpesa.transactionType,
          callbackBaseUrl: settings.mpesa.callbackBaseUrl || `${proto}://${host}`,
        }}
        initialSeo={settings.seo}
        initialBackup={{ ...settings.backup, secretAccessKey: maskSecret(settings.backup.secretAccessKey) }}
        adminPhone={admin.phone}
        imageCount={imageCount}
      />
    </div>
  );
}
