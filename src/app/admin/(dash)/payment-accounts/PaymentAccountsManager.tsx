"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  Plug,
  Plus,
  Star,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import { PasswordInput } from "@/components/PasswordInput";
import type { DarajaEnvironment, DarajaTransactionType } from "@/lib/payment-accounts";

export type PaymentAccountRow = {
  id: number;
  label: string;
  environment: DarajaEnvironment;
  consumerKey: string; // masked
  consumerSecret: string; // masked
  passkey: string; // masked
  shortcode: string;
  transactionType: DarajaTransactionType;
  tillNumber: string;
  callbackBaseUrl: string;
  isDefault: boolean;
  active: boolean;
  productCount: number;
};

const emptyForm = {
  label: "",
  environment: "sandbox" as DarajaEnvironment,
  consumerKey: "",
  consumerSecret: "",
  passkey: "",
  shortcode: "",
  transactionType: "CustomerBuyGoodsOnline" as DarajaTransactionType,
  tillNumber: "",
  callbackBaseUrl: "",
  active: true,
};

export function PaymentAccountsManager({
  initial,
  suggestedCallback,
}: {
  initial: PaymentAccountRow[];
  suggestedCallback: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PaymentAccountRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(account: PaymentAccountRow) {
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ hidden?: boolean; reason?: string }>(
        `/api/admin/payment-accounts/${account.id}`,
        { method: "DELETE" }
      );
      if (res.hidden) setError(res.reason || `"${account.label}" was deactivated instead of deleted.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(account: PaymentAccountRow) {
    setError(null);
    setBusy(true);
    try {
      await api(`/api/admin/payment-accounts/${account.id}/set-default`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set default.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-[13px] text-ink-mute">{initial.length} account(s)</p>
        <button className="btn btn-md btn-primary" onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4" /> Add payment account
        </button>
      </div>

      {error ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-medium px-3.5 py-3 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      ) : null}

      {initial.length === 0 ? (
        <div className="card p-8 text-center">
          <Wallet className="w-8 h-8 text-ink-mute mx-auto" />
          <p className="text-ink-soft mt-3">
            No payment accounts yet — customers can&apos;t pay until you add one.
          </p>
          <button className="btn btn-md btn-primary mt-4" onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4" /> Add your first account
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {initial.map((acc) => (
            <div key={acc.id} className={`card p-5 ${acc.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-ink">{acc.label}</span>
                    {acc.isDefault ? <span className="badge badge-green">Default</span> : null}
                    {!acc.active ? <span className="badge badge-gray">Hidden</span> : null}
                  </div>
                  <div className="text-[12px] text-ink-mute mt-0.5">
                    {acc.environment === "production" ? "Production" : "Sandbox"} ·{" "}
                    {acc.transactionType === "CustomerBuyGoodsOnline" ? "Buy Goods" : "Paybill"} ·{" "}
                    Shortcode {acc.shortcode || "—"}
                    {acc.transactionType === "CustomerBuyGoodsOnline" ? ` · Till ${acc.tillNumber || "—"}` : ""}
                  </div>
                  <div className="text-[12px] text-ink-mute">
                    {acc.productCount} product{acc.productCount === 1 ? "" : "s"} assigned
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="btn btn-sm btn-outline" onClick={() => setEditing(acc)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                    onClick={() => remove(acc)}
                    disabled={busy}
                    aria-label={`Delete ${acc.label}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {!acc.isDefault ? (
                <button
                  className="btn btn-sm btn-outline mt-3"
                  onClick={() => setDefault(acc)}
                  disabled={busy}
                >
                  <Star className="w-3.5 h-3.5" /> Set as default
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <AccountEditor
          value={editing === "new" ? { ...emptyForm, callbackBaseUrl: suggestedCallback } : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function AccountEditor({
  value,
  onClose,
  onSaved,
}: {
  value: PaymentAccountRow | typeof emptyForm;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !("id" in value);
  const [label, setLabel] = useState(value.label);
  const [environment, setEnvironment] = useState<DarajaEnvironment>(value.environment);
  const [consumerKey, setConsumerKey] = useState(value.consumerKey);
  const [consumerSecret, setConsumerSecret] = useState(value.consumerSecret);
  const [passkey, setPasskey] = useState(value.passkey);
  const [shortcode, setShortcode] = useState(value.shortcode);
  const [transactionType, setTransactionType] = useState<DarajaTransactionType>(value.transactionType);
  const [tillNumber, setTillNumber] = useState(value.tillNumber);
  const [callbackBaseUrl, setCallbackBaseUrl] = useState(value.callbackBaseUrl);
  const [active, setActive] = useState(value.active);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const payload = {
        label: label.trim(),
        environment,
        // masked values ("••••abcd") mean "keep existing" — send empty so
        // the server merges rather than overwrites
        consumerKey: consumerKey.startsWith("•") ? "" : consumerKey,
        consumerSecret: consumerSecret.startsWith("•") ? "" : consumerSecret,
        passkey: passkey.startsWith("•") ? "" : passkey,
        shortcode: shortcode.trim(),
        transactionType,
        tillNumber: tillNumber.trim(),
        callbackBaseUrl: callbackBaseUrl.trim(),
        active,
      };
      if (isNew) {
        await api("/api/admin/payment-accounts", { body: payload });
      } else {
        await api(`/api/admin/payment-accounts/${(value as PaymentAccountRow).id}`, {
          method: "PATCH",
          body: payload,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  async function testConnection(withPush: boolean) {
    if (isNew) {
      setTestResult({ ok: false, message: "Save the account first, then test it." });
      return;
    }
    setTestResult(null);
    setTesting(true);
    try {
      const res = await api<{ message: string }>(
        `/api/admin/payment-accounts/${(value as PaymentAccountRow).id}/test`,
        { body: withPush ? { phone: testPhone, amount: 1 } : {} }
      );
      setTestResult({ ok: true, message: res.message });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : "Test failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
      <div className="bg-surface w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-lift max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-extrabold text-ink flex items-center gap-2">
            <Wallet className="w-5 h-5 text-brand-600" />
            {isNew ? "New payment account" : `Edit "${value.label}"`}
          </h2>
          <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-800 leading-relaxed flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            Credentials are encrypted before they touch the database. Get them
            from developer.safaricom.co.ke → your app → Keys.
          </div>

          <div>
            <label className="label">Account name</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Main Shop Till" />
          </div>

          {transactionType === "CustomerBuyGoodsOnline" ? (
            <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-[13px] text-sky-800 leading-relaxed flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Buy Goods needs <strong>two different numbers</strong>: the{" "}
              <strong>Business Shortcode</strong> below (Store/HO number from Go
              Live) and the <strong>Till Number</strong> further down. Using the
              same value for both is the most common cause of Daraja error 2002.
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Environment</label>
              <select className="input" value={environment} onChange={(e) => setEnvironment(e.target.value as DarajaEnvironment)}>
                <option value="sandbox">Sandbox — testing</option>
                <option value="production">Production — real money</option>
              </select>
            </div>
            <div>
              <label className="label">Transaction type</label>
              <select className="input" value={transactionType} onChange={(e) => setTransactionType(e.target.value as DarajaTransactionType)}>
                <option value="CustomerBuyGoodsOnline">Till (Buy Goods)</option>
                <option value="CustomerPayBillOnline">Paybill</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                {transactionType === "CustomerBuyGoodsOnline"
                  ? "Business Shortcode (Store/HO number)"
                  : "Shortcode (Paybill number)"}
              </label>
              <input className="input" value={shortcode} onChange={(e) => setShortcode(e.target.value)} placeholder="e.g. 174379" inputMode="numeric" />
            </div>
            <div>
              <label className="label">Callback base URL</label>
              <input className="input" value={callbackBaseUrl} onChange={(e) => setCallbackBaseUrl(e.target.value)} placeholder="https://yourdomain.co.ke" />
              <p className="field-hint">Where Daraja sends payment confirmations.</p>
            </div>
          </div>

          {transactionType === "CustomerBuyGoodsOnline" ? (
            <div>
              <label className="label">Till number</label>
              <input
                className="input"
                value={tillNumber}
                onChange={(e) => setTillNumber(e.target.value)}
                placeholder="e.g. 3547433"
                inputMode="numeric"
              />
              <p className="field-hint">
                The actual till customers pay at — sent as PartyB. Must differ
                from the Business Shortcode above.
              </p>
            </div>
          ) : null}

          <div>
            <label className="label">Consumer key</label>
            <PasswordInput value={consumerKey} onChange={setConsumerKey} placeholder="From your Daraja app" autoComplete="off" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Consumer secret</label>
              <PasswordInput value={consumerSecret} onChange={setConsumerSecret} placeholder="Leave as-is to keep current" autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Passkey</label>
              <PasswordInput value={passkey} onChange={setPasskey} placeholder="Leave as-is to keep current" autoComplete="new-password" />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 cursor-pointer">
            <span className="text-sm font-semibold text-ink">Active (selectable for products)</span>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-5 h-5 accent-[#3aa335]" />
          </label>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-md btn-primary" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isNew ? "Create account" : "Save changes"}
            </button>
          </div>

          {!isNew ? (
            <div className="rounded-2xl border border-line bg-paper p-4 space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-ink">
                <Plug className="w-4.5 h-4.5 text-brand-600" /> Test the connection
              </div>
              <p className="text-[13px] text-ink-soft leading-relaxed">
                Save your changes above first. Checks the key &amp; secret with
                Safaricom, and optionally sends a real KSh 1 STK push.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-md btn-outline" onClick={() => testConnection(false)} disabled={testing}>
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Check credentials
                </button>
                <input
                  className="input w-44"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  inputMode="tel"
                />
                <button className="btn btn-md btn-outline" onClick={() => testConnection(true)} disabled={testing || !testPhone}>
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
