"use client";

import { useState } from "react";
import { CheckCircle2, DatabaseBackup, Loader2, Plug, Save, ShieldAlert } from "lucide-react";
import { api } from "@/lib/client";
import type { BusinessSettings, MpesaSettings, SeoSettings, BackupSettings } from "@/lib/settings";

type Tab = "business" | "mpesa" | "seo" | "backup";

export function SettingsTabs({
  initialBusiness,
  initialMpesa,
  initialSeo,
  initialBackup,
  adminPhone,
  imageCount,
}: {
  initialBusiness: BusinessSettings;
  initialMpesa: MpesaSettings & { consumerSecret: string; passkey: string };
  initialSeo: SeoSettings;
  initialBackup: BackupSettings;
  adminPhone: string;
  imageCount: number;
}) {
  const [tab, setTab] = useState<Tab>("business");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [business, setBusiness] = useState(initialBusiness);
  const [mpesa, setMpesa] = useState({ ...initialMpesa });
  const [seo, setSeo] = useState(initialSeo);
  const [backup, setBackup] = useState({ ...initialBackup });

  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [backupRunning, setBackupRunning] = useState(false);
  const [backupResult, setBackupResult] = useState<{ ok: boolean; message: string } | null>(null);

  function setB<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setBusiness((b) => ({ ...b, [key]: value }));
  }
  function setM<K extends keyof typeof mpesa>(key: K, value: (typeof mpesa)[K]) {
    setMpesa((m) => ({ ...m, [key]: value }));
  }
  function setBk<K extends keyof BackupSettings>(key: K, value: BackupSettings[K]) {
    setBackup((b) => ({ ...b, [key]: value }));
  }

  async function save(group: Tab) {
    setNotice(null);
    setError(null);
    setBusy(true);
    try {
      const patch =
        group === "business"
          ? business
          : group === "seo"
            ? seo
            : group === "backup"
              ? {
                  enabled: backup.enabled,
                  endpoint: backup.endpoint,
                  region: backup.region,
                  bucket: backup.bucket,
                  accessKeyId: backup.accessKeyId,
                  // masked value ("••••abcd") means "keep existing" — send empty
                  secretAccessKey: backup.secretAccessKey.startsWith("•") ? "" : backup.secretAccessKey,
                  prefix: backup.prefix,
                  intervalHours: backup.intervalHours,
                  retentionCount: backup.retentionCount,
                }
              : {
                  environment: mpesa.environment,
                  consumerKey: mpesa.consumerKey,
                  // masked values ("••••abcd") are skipped server-side only when empty;
                  // detect mask and send empty so current secret is kept
                  consumerSecret: mpesa.consumerSecret.startsWith("•") ? "" : mpesa.consumerSecret,
                  passkey: mpesa.passkey.startsWith("•") ? "" : mpesa.passkey,
                  shortcode: mpesa.shortcode,
                  transactionType: mpesa.transactionType,
                  tillNumber: mpesa.tillNumber,
                  callbackBaseUrl: mpesa.callbackBaseUrl,
                };
      await api("/api/admin/settings", { body: { group, patch } });
      setNotice("Saved — live on the site immediately.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function testDaraja(withPush: boolean) {
    setTestResult(null);
    setTesting(true);
    try {
      const res = await api<{ message: string }>("/api/admin/settings/test-daraja", {
        body: withPush ? { phone: testPhone, amount: 1 } : {},
      });
      setTestResult({ ok: true, message: res.message });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Test failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function runBackupNow() {
    setBackupResult(null);
    setBackupRunning(true);
    try {
      const res = await api<{ message: string }>("/api/admin/settings/backup-now", { body: {} });
      setBackupResult({ ok: true, message: res.message });
    } catch (err) {
      setBackupResult({
        ok: false,
        message: err instanceof Error ? err.message : "Backup failed.",
      });
    } finally {
      setBackupRunning(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "business", label: "Business" },
    { key: "mpesa", label: "M-Pesa · Daraja" },
    { key: "seo", label: "SEO" },
    { key: "backup", label: "Backups" },
  ];

  return (
    <div>
      <div className="flex gap-2 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setNotice(null);
              setError(null);
            }}
            className={`px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors -mb-px border-b-2 ${
              tab === t.key
                ? "text-brand-700 border-brand-500 bg-brand-50/60"
                : "text-ink-mute border-transparent hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice ? (
        <div className="mt-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-[13px] font-semibold px-3.5 py-3 flex gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {notice}
        </div>
      ) : null}
      {error ? <p className="field-error mt-4">{error}</p> : null}

      {tab === "business" ? (
        <div className="card p-6 mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Shop name</label>
              <input className="input" value={business.name} onChange={(e) => setB("name", e.target.value)} />
            </div>
            <div>
              <label className="label">Legal name (T&amp;C, receipts)</label>
              <input className="input" value={business.legalName} onChange={(e) => setB("legalName", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Tagline</label>
            <input className="input" value={business.tagline} onChange={(e) => setB("tagline", e.target.value)} />
          </div>
          <div>
            <label className="label">About blurb (used in About page &amp; SEO)</label>
            <textarea className="input" rows={3} value={business.description} onChange={(e) => setB("description", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={business.phone} onChange={(e) => setB("phone", e.target.value)} />
            </div>
            <div>
              <label className="label">WhatsApp number</label>
              <input className="input" value={business.whatsapp} onChange={(e) => setB("whatsapp", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={business.email} onChange={(e) => setB("email", e.target.value)} />
            </div>
            <div>
              <label className="label">M-Pesa Till number (displayed to customers)</label>
              <input className="input" value={business.tillNumber} onChange={(e) => setB("tillNumber", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Location</label>
              <input className="input" value={business.location} onChange={(e) => setB("location", e.target.value)} />
            </div>
            <div>
              <label className="label">Opening hours</label>
              <input className="input" value={business.openHours} onChange={(e) => setB("openHours", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Top-bar announcement (empty = hidden)</label>
            <input className="input" value={business.announcement} onChange={(e) => setB("announcement", e.target.value)} placeholder="e.g. New year bundle deals — while stocks last!" />
          </div>
          <p className="field-hint">
            Image storage in use: {imageCount}/120 uploads.
          </p>
          <div className="flex justify-end">
            <button className="btn btn-md btn-primary" onClick={() => save("business")} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save business
            </button>
          </div>
        </div>
      ) : null}

      {tab === "mpesa" ? (
        <div className="card p-6 mt-4 space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-800 leading-relaxed flex gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            These credentials are encrypted before they touch the database. Get them
            from developer.safaricom.co.ke → your app → Keys. For a till, choose
            “Customer Buy Goods Online” and enable API access on your till in the
            M-Pesa For Business app.
          </div>

          {mpesa.transactionType === "CustomerBuyGoodsOnline" ? (
            <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-[13px] text-sky-800 leading-relaxed flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              Buy Goods needs <strong>two different numbers</strong>, per Safaricom&apos;s own
              Daraja docs: the <strong>Business Shortcode</strong> below (the Store/HO
              number issued at Go Live) and the <strong>Till Number</strong> further down.
              Entering the till number in both is the most common cause of Daraja
              error 2002 (&ldquo;Agent number and Store number do not match&rdquo;).
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Environment</label>
              <select className="input" value={mpesa.environment} onChange={(e) => setM("environment", e.target.value as "sandbox" | "production")}>
                <option value="sandbox">Sandbox — testing</option>
                <option value="production">Production — real money</option>
              </select>
            </div>
            <div>
              <label className="label">Transaction type</label>
              <select className="input" value={mpesa.transactionType} onChange={(e) => setM("transactionType", e.target.value as MpesaSettings["transactionType"])}>
                <option value="CustomerBuyGoodsOnline">Till (Buy Goods)</option>
                <option value="CustomerPayBillOnline">Paybill</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                {mpesa.transactionType === "CustomerBuyGoodsOnline"
                  ? "Business Shortcode (Store/HO number)"
                  : "Shortcode (Paybill number)"}
              </label>
              <input className="input" value={mpesa.shortcode} onChange={(e) => setM("shortcode", e.target.value)} placeholder="e.g. 174379" inputMode="numeric" />
              {mpesa.transactionType === "CustomerBuyGoodsOnline" ? (
                <p className="field-hint">The Store/HO shortcode you were issued at Go Live — not the till number.</p>
              ) : null}
            </div>
            <div>
              <label className="label">Callback base URL</label>
              <input className="input" value={mpesa.callbackBaseUrl} onChange={(e) => setM("callbackBaseUrl", e.target.value)} placeholder="https://yourdomain.co.ke" />
              <p className="field-hint">Where Daraja sends payment confirmations. The suggested value is pre-filled.</p>
            </div>
          </div>

          {mpesa.transactionType === "CustomerBuyGoodsOnline" ? (
            <div>
              <label className="label">Till number</label>
              <input
                className="input"
                value={mpesa.tillNumber}
                onChange={(e) => setM("tillNumber", e.target.value)}
                placeholder="e.g. 3547433"
                inputMode="numeric"
              />
              <p className="field-hint">
                The actual till number customers see when paying at the counter — sent
                as PartyB. Must be different from the Business Shortcode above.
              </p>
            </div>
          ) : null}

          <div>
            <label className="label">Consumer key</label>
            <input className="input" value={mpesa.consumerKey} onChange={(e) => setM("consumerKey", e.target.value)} placeholder="From your Daraja app" autoComplete="off" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Consumer secret (write-only)</label>
              <input className="input" type="password" value={mpesa.consumerSecret} onChange={(e) => setM("consumerSecret", e.target.value)} placeholder="Leave as-is to keep current" autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Passkey (write-only)</label>
              <input className="input" type="password" value={mpesa.passkey} onChange={(e) => setM("passkey", e.target.value)} placeholder="Leave as-is to keep current" autoComplete="new-password" />
            </div>
          </div>

          <div className="flex justify-end">
            <button className="btn btn-md btn-primary" onClick={() => save("mpesa")} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save M-Pesa settings
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-4 space-y-3">
            <div className="flex items-center gap-2 font-extrabold text-ink">
              <Plug className="w-4.5 h-4.5 text-brand-600" /> Test the connection
            </div>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              First checks your key &amp; secret with Safaricom. Optionally send a real
              KSh 1 STK push and wait ~10s for Daraja to confirm what actually
              happened — not just that the request was accepted.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-md btn-outline" onClick={() => testDaraja(false)} disabled={testing}>
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Check credentials
              </button>
              <input
                className="input w-44"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder={`e.g. 0${adminPhone.slice(3)}`}
                inputMode="tel"
              />
              <button className="btn btn-md btn-outline" onClick={() => testDaraja(true)} disabled={testing || !testPhone}>
                Send KSh 1 test push
              </button>
            </div>
            {testResult ? (
              <div
                className={`rounded-xl px-3.5 py-3 text-[13px] font-medium border ${
                  testResult.ok
                    ? "bg-brand-50 border-brand-200 text-brand-800"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {testResult.message}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "seo" ? (
        <div className="card p-6 mt-4 space-y-4">
          <div>
            <label className="label">Site title (browser tab &amp; Google)</label>
            <input className="input" value={seo.siteTitle} onChange={(e) => setSeo((s) => ({ ...s, siteTitle: e.target.value }))} />
          </div>
          <div>
            <label className="label">Site description</label>
            <textarea className="input" rows={3} value={seo.siteDescription} onChange={(e) => setSeo((s) => ({ ...s, siteDescription: e.target.value }))} />
          </div>
          <div>
            <label className="label">Keywords (comma separated)</label>
            <input className="input" value={seo.keywords} onChange={(e) => setSeo((s) => ({ ...s, keywords: e.target.value }))} />
          </div>
          <div className="flex justify-end">
            <button className="btn btn-md btn-primary" onClick={() => save("seo")} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save SEO
            </button>
          </div>
        </div>
      ) : null}

      {tab === "backup" ? (
        <div className="card p-6 mt-4 space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-800 leading-relaxed flex gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            Automatic snapshots of the whole database, uploaded off-site so an
            outage or a mistake here never means losing your orders and catalog.
            Works with any S3-compatible storage — AWS S3, Cloudflare R2,
            Backblaze B2, DigitalOcean Spaces. Credentials are encrypted before
            they touch the database.
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={backup.enabled}
              onChange={(e) => setBk("enabled", e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[#3aa335]"
            />
            <span>
              <span className="block text-sm font-bold text-ink">Enable scheduled backups</span>
              <span className="block text-[12px] text-ink-mute">
                Runs automatically in the background at the interval below.
              </span>
            </span>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Endpoint URL (blank = AWS S3)</label>
              <input
                className="input"
                value={backup.endpoint}
                onChange={(e) => setBk("endpoint", e.target.value)}
                placeholder="e.g. https://<account>.r2.cloudflarestorage.com"
              />
            </div>
            <div>
              <label className="label">Region</label>
              <input
                className="input"
                value={backup.region}
                onChange={(e) => setBk("region", e.target.value)}
                placeholder="us-east-1, or “auto” for R2"
              />
            </div>
          </div>

          <div>
            <label className="label">Bucket name</label>
            <input className="input" value={backup.bucket} onChange={(e) => setBk("bucket", e.target.value)} placeholder="gcn-backups" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Access key ID</label>
              <input className="input" value={backup.accessKeyId} onChange={(e) => setBk("accessKeyId", e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label className="label">Secret access key (write-only)</label>
              <input
                className="input"
                type="password"
                value={backup.secretAccessKey}
                onChange={(e) => setBk("secretAccessKey", e.target.value)}
                placeholder="Leave as-is to keep current"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Folder / prefix</label>
              <input className="input" value={backup.prefix} onChange={(e) => setBk("prefix", e.target.value)} placeholder="gcn-backups" />
            </div>
            <div>
              <label className="label">Every (hours)</label>
              <input
                className="input"
                type="number"
                min={0}
                max={168}
                value={backup.intervalHours}
                onChange={(e) => setBk("intervalHours", Math.max(0, parseInt(e.target.value || "0", 10)))}
              />
              <p className="field-hint">0 = manual backups only</p>
            </div>
            <div>
              <label className="label">Keep last</label>
              <input
                className="input"
                type="number"
                min={0}
                max={365}
                value={backup.retentionCount}
                onChange={(e) => setBk("retentionCount", Math.max(0, parseInt(e.target.value || "0", 10)))}
              />
              <p className="field-hint">0 = keep every backup</p>
            </div>
          </div>

          {backup.lastRunAt ? (
            <p className="field-hint">
              Last backup: {new Date(backup.lastRunAt).toLocaleString("en-KE")} —{" "}
              <span className={backup.lastRunOk ? "text-brand-700 font-semibold" : "text-red-600 font-semibold"}>
                {backup.lastRunOk ? "succeeded" : "failed"}
              </span>{" "}
              — {backup.lastRunMessage}
            </p>
          ) : (
            <p className="field-hint">No backup has run yet.</p>
          )}

          <div className="flex justify-end">
            <button className="btn btn-md btn-primary" onClick={() => save("backup")} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save backup settings
            </button>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-4 space-y-3">
            <div className="flex items-center gap-2 font-extrabold text-ink">
              <DatabaseBackup className="w-4.5 h-4.5 text-brand-600" /> Run a backup now
            </div>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Save your settings above first, then use this to confirm the bucket
              and credentials actually work before relying on the schedule.
            </p>
            <button className="btn btn-md btn-outline" onClick={runBackupNow} disabled={backupRunning}>
              {backupRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />} Back up now
            </button>
            {backupResult ? (
              <div
                className={`rounded-xl px-3.5 py-3 text-[13px] font-medium border ${
                  backupResult.ok
                    ? "bg-brand-50 border-brand-200 text-brand-800"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {backupResult.message}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
