"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { api } from "@/lib/client";

export function NewTicketForm({
  defaultName,
  defaultPhone,
  loggedIn,
}: {
  defaultName: string;
  defaultPhone: string;
  loggedIn: boolean;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [orderCode, setOrderCode] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await api<{ code: string }>("/api/support/tickets", {
        body: { name, phone, subject, message, orderCode },
      });
      setDone(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center animate-fade-up">
        <div className="mx-auto w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="mt-4 font-extrabold text-lg">Message sent!</h2>
        <p className="text-ink-soft text-sm mt-1.5">
          Your reference is <span className="font-extrabold text-ink">{done}</span>. We
          typically reply within minutes during working hours.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link href={`/support/${done}?phone=${phone}`} className="btn btn-md btn-primary">
            View conversation
          </Link>
          <button className="btn btn-md btn-ghost" onClick={() => setDone(null)}>
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <h2 className="font-extrabold text-ink">Send us a message</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tname" className="label">Your name</label>
          <input id="tname" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="e.g. Jane Wanjiku" />
        </div>
        <div>
          <label htmlFor="tphone" className="label">Phone number</label>
          <input id="tphone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="e.g. 0712 345 678" />
        </div>
      </div>
      <div>
        <label htmlFor="tsubject" className="label">Subject</label>
        <input id="tsubject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} placeholder="e.g. Bundle not received" />
      </div>
      <div>
        <label htmlFor="torder" className="label">Order code (optional — helps us find it faster)</label>
        <input id="torder" className="input uppercase tracking-wider" value={orderCode} onChange={(e) => setOrderCode(e.target.value.toUpperCase())} placeholder="GCN-XXXXXX" />
      </div>
      <div>
        <label htmlFor="tmessage" className="label">Message</label>
        <textarea id="tmessage" className="input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} placeholder="Tell us what happened and we'll sort it out…" />
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <button className="btn btn-lg btn-primary" disabled={busy}>
        {busy ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
        {busy ? "Sending…" : "Send message"}
      </button>
      {!loggedIn ? (
        <p className="field-hint">
          Tip: <Link href="/login" className="text-brand-700 font-semibold underline">log in</Link> to keep
          all your conversations in one place.
        </p>
      ) : null}
    </form>
  );
}
