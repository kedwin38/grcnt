"use client";

import { useState } from "react";
import { Loader2, Send, User, Headset } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { api } from "@/lib/client";

type Msg = { fromStaff: boolean; body: string; createdAt: string };

export function TicketThread({
  code,
  subject,
  status,
  phone,
  messages: initial,
}: {
  code: string;
  subject: string;
  status: "NEW" | "OPEN" | "RESOLVED";
  phone: string;
  messages: Msg[];
}) {
  const [messages, setMessages] = useState(initial);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await api(`/api/support/tickets/${code}?phone=${encodeURIComponent(phone)}`, {
        body: { body: reply },
      });
      setMessages((m) => [
        ...m,
        { fromStaff: false, body: reply, createdAt: new Date().toISOString() },
      ]);
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[13px] font-semibold text-brand-700">
            <a href="/support" className="hover:underline">← Support</a>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight mt-0.5">{subject}</h1>
          <div className="text-[12px] text-ink-mute">{code}</div>
        </div>
        {status === "NEW" ? (
          <span className="badge badge-amber">Waiting for us</span>
        ) : status === "OPEN" ? (
          <span className="badge badge-blue">In conversation</span>
        ) : (
          <span className="badge badge-green">Resolved</span>
        )}
      </div>

      <div className="card mt-6 p-4 sm:p-6 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.fromStaff ? "" : "flex-row-reverse"}`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                msg.fromStaff
                  ? "bg-brand-600 text-white"
                  : "bg-brand-50 border border-brand-100 text-brand-700"
              }`}
            >
              {msg.fromStaff ? <Headset className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
            </div>
            <div
              className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                msg.fromStaff
                  ? "bg-brand-50/70 border border-brand-100 text-ink"
                  : "bg-brand-600 text-white"
              }`}
            >
              <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{msg.body}</div>
              <div
                className={`text-[11px] mt-1.5 ${
                  msg.fromStaff ? "text-ink-mute" : "text-white/70"
                }`}
              >
                {msg.fromStaff ? "Support" : "You"} · {formatDateTime(msg.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {status !== "RESOLVED" ? (
        <form onSubmit={send} className="card p-4 mt-4">
          <textarea
            className="input"
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            aria-label="Your reply"
          />
          {error ? <p className="field-error">{error}</p> : null}
          <div className="flex justify-end mt-3">
            <button className="btn btn-md btn-primary" disabled={busy || !reply.trim()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send reply
            </button>
          </div>
        </form>
      ) : (
        <p className="text-center text-[13px] text-ink-mute mt-4">
          This conversation is resolved. Need anything else?{" "}
          <a href="/support" className="text-brand-700 font-semibold underline">Send a new message</a>.
        </p>
      )}
    </div>
  );
}
