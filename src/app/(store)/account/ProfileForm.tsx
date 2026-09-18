"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Loader2, Phone, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import { PasswordInput } from "@/components/PasswordInput";

export function ProfileForm({
  name,
  email,
  phone,
  hasPassword,
}: {
  name: string;
  email: string;
  phone: string | null;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [profileName, setProfileName] = useState(name);
  const [profileEmail, setProfileEmail] = useState(email);
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await api("/api/auth/profile", {
        method: "PATCH",
        body: { name: profileName, email: profileEmail, phone: profilePhone || undefined },
      });
      setProfileSaved(true);
      setProfilePhone("");
      router.refresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (newPassword !== confirmPassword) {
      setPwError("The new passwords don't match.");
      return;
    }
    setSavingPw(true);
    try {
      await api("/api/auth/profile", { method: "PUT", body: { currentPassword, newPassword } });
      setPwSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={saveProfile} className="card p-6 space-y-4">
        <h2 className="font-extrabold text-ink flex items-center gap-2">
          <UserRound className="w-5 h-5 text-brand-600" /> Details
        </h2>
        <div>
          <label htmlFor="pname" className="label">Full name</label>
          <input id="pname" className="input" value={profileName} onChange={(e) => setProfileName(e.target.value)} required minLength={2} />
        </div>
        <div>
          <label htmlFor="pemail" className="label">Email (optional)</label>
          <input id="pemail" type="email" className="input" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        {phone ? (
          <div>
            <label className="label">Phone number</label>
            <div className="input bg-brand-50/40 text-ink-soft flex items-center gap-2">
              <Phone className="w-4 h-4" /> {phone}
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="pphone" className="label">Phone number (optional)</label>
            <input
              id="pphone"
              className="input"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="0712 345 678"
              inputMode="tel"
            />
            <p className="text-[12px] text-ink-mute mt-1">
              Add a phone number to also log in with it next time and speed up checkout.
            </p>
          </div>
        )}
        {profileError ? <p className="field-error">{profileError}</p> : null}
        {profileSaved ? (
          <p className="text-[13px] font-semibold text-brand-700 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Saved
          </p>
        ) : null}
        <button className="btn btn-md btn-primary" disabled={savingProfile}>
          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save details
        </button>
      </form>

      <form onSubmit={changePassword} className="card p-6 space-y-4">
        <h2 className="font-extrabold text-ink flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-brand-600" /> {hasPassword ? "Change password" : "Set a password"}
        </h2>
        {!hasPassword ? (
          <p className="text-[13px] text-ink-soft -mt-2">
            You signed up with Google — set a password if you'd also like to log in with your phone number.
          </p>
        ) : null}
        {hasPassword ? (
          <div>
            <label htmlFor="cpw" className="label">Current password</label>
            <PasswordInput id="cpw" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" required />
          </div>
        ) : null}
        <div>
          <label htmlFor="npw" className="label">New password</label>
          <PasswordInput id="npw" value={newPassword} onChange={setNewPassword} autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <label htmlFor="cnpw" className="label">Confirm new password</label>
          <PasswordInput id="cnpw" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" minLength={8} required />
        </div>
        {pwError ? <p className="field-error">{pwError}</p> : null}
        {pwSaved ? (
          <p className="text-[13px] font-semibold text-brand-700 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Password changed
          </p>
        ) : null}
        <button className="btn btn-md btn-primary" disabled={savingPw}>
          {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {hasPassword ? "Change password" : "Set password"}
        </button>
      </form>
    </div>
  );
}
