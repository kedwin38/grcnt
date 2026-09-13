"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { PasswordInput } from "@/components/PasswordInput";

export function AdminLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await api<{ role: string }>("/api/auth/login", {
        body: { phone, password },
      });
      if (user.role !== "ADMIN" && user.role !== "STAFF") {
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

  return (
    <form onSubmit={submit} className="space-y-4">
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
