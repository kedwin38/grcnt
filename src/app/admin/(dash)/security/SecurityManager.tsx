"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, KeyRound, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { api } from "@/lib/client";
import { PasswordInput } from "@/components/PasswordInput";

export function SecurityManager({ totpEnabled }: { totpEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(totpEnabled);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUri: string; qrDataUrl: string } | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [code, setCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function startSetup() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await api<{ secret: string; otpauthUri: string; qrDataUrl: string }>("/api/admin/security/totp/setup", { body: {} });
      setSetupData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/admin/security/totp/confirm", { body: { code } });
      setEnabled(true);
      setSetupData(null);
      setCode("");
      setNotice("Two-factor authentication is now enabled.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/admin/security/totp/disable", { body: { currentPassword: disablePassword } });
      setEnabled(false);
      setShowDisable(false);
      setDisablePassword("");
      setNotice("Two-factor authentication has been disabled.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-brand-100" : "bg-paper border border-line"}`}>
          {enabled ? <ShieldCheck className="w-5 h-5 text-brand-700" /> : <ShieldOff className="w-5 h-5 text-ink-mute" />}
        </div>
        <div>
          <div className="font-bold text-ink">Two-factor authentication</div>
          <div className="text-[13px] text-ink-mute">
            {enabled ? "Enabled — a code is required at every login." : "Not enabled."}
          </div>
        </div>
      </div>

      {notice ? (
        <p className="text-[13px] font-semibold text-brand-700 flex items-center gap-1.5">
          <Check className="w-4 h-4" /> {notice}
        </p>
      ) : null}
      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      ) : null}

      {!enabled && !setupData ? (
        <button className="btn btn-md btn-primary" onClick={startSetup} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Enable 2FA
        </button>
      ) : null}

      {setupData ? (
        <form onSubmit={confirmSetup} className="space-y-4 rounded-2xl border border-line bg-paper p-4">
          <div>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Scan this with Google Authenticator, Authy, 1Password or any TOTP app:
            </p>
            <div className="mt-3 flex justify-center">
              <div className="rounded-2xl border border-line bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setupData.qrDataUrl} alt="Scan with your authenticator app" width={200} height={200} />
              </div>
            </div>
            {!showManualEntry ? (
              <button
                type="button"
                className="text-[13px] font-semibold text-brand-700 hover:underline mt-3 mx-auto block"
                onClick={() => setShowManualEntry(true)}
              >
                Can&apos;t scan? Enter the code manually
              </button>
            ) : (
              <div className="mt-3">
                <p className="text-[13px] text-ink-soft leading-relaxed">
                  In your app, choose &ldquo;enter a setup key manually&rdquo; and paste this secret:
                </p>
                <div className="mt-2 rounded-xl bg-surface border border-line px-3.5 py-2.5 font-mono text-sm break-all select-all">
                  {setupData.secret}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="label">Enter the 6-digit code to confirm</label>
            <input
              className="input text-center text-lg tracking-[0.4em] font-bold"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-md btn-primary" disabled={busy || code.length !== 6}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirm &amp; enable
            </button>
            <button
              type="button"
              className="btn btn-md btn-ghost"
              onClick={() => {
                setSetupData(null);
                setCode("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {enabled ? (
        showDisable ? (
          <form onSubmit={disable} className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-[13px] font-semibold text-red-700">
              Disabling 2FA means only your password protects this account.
              Confirm your current password to continue.
            </p>
            <PasswordInput
              value={disablePassword}
              onChange={setDisablePassword}
              placeholder="Current password"
              autoComplete="current-password"
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-md btn-danger" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Disable 2FA
              </button>
              <button type="button" className="btn btn-md btn-ghost" onClick={() => setShowDisable(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className="btn btn-md btn-ghost text-red-600 hover:bg-red-50 w-fit" onClick={() => setShowDisable(true)}>
            Disable 2FA…
          </button>
        )
      ) : null}
    </div>
  );
}
