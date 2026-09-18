"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { PasswordInput } from "@/components/PasswordInput";

export function AdminLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"credentials" | "totp">("credentials");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await api<{ role?: string; requiresTotp?: boolean }>("/api/auth/login", {
        body: { phone, password },
      });
      if (result.requiresTotp) {
        setStage("totp");
        setBusy(false);
        return;
      }
      if (result.role !== "ADMIN" && result.role !== "STAFF") {
        setError("This account doesn't have back-office access.");
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setBusy(false);
    }
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/auth/login/verify-totp", { body: { code } });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
      setBusy(false);
    }
  }

  if (stage === "totp") {
    return (
      <form onSubmit={submitTotp} className="space-y-4">
        <div className="text-center mb-2">
          <div className="mx-auto w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-brand-700" />
          </div>
          <p className="text-[13px] text-ink-soft mt-2">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>
        <div>
          <label htmlFor="totp-code" className="label">Authentication code</label>
          <input
            id="totp-code"
            className="input text-center text-lg tracking-[0.4em] font-bold"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            required
          />
        </div>
        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        ) : null}
        <button type="submit" className="btn btn-lg btn-primary w-full" disabled={busy || code.length !== 6}>
          {busy ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <ShieldCheck className="w-4.5 h-4.5" />}
          {busy ? "Verifying…" : "Verify"}
        </button>
        <button
          type="button"
          className="btn btn-md btn-ghost w-full"
          onClick={() => {
            setStage("credentials");
            setCode("");
            setError(null);
          }}
        >
          Back
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCredentials} className="space-y-4">
      <div>
        <label htmlFor="aphone" className="label">Phone number</label>
        <input
          id="aphone"
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          required
        />
      </div>
      <div>
        <label htmlFor="apassword" className="label">Password</label>
        <PasswordInput
          id="apassword"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
      </div>
      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      ) : null}
      <button type="submit" className="btn btn-lg btn-primary w-full" disabled={busy}>
        {busy ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <ShieldCheck className="w-4.5 h-4.5" />}
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
