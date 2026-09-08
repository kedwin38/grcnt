"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Send } from "lucide-react";
import { api } from "@/lib/client";

export function StaffReply({ ticketId, resolved }: { ticketId: number; resolved: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"reply" | "resolve" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(resolve: boolean) {
    if (!body.trim()) return;
    setError(null);
    setBusy(resolve ? "resolve" : "reply");
    try {
      await api(`/api/admin/support/${ticketId}`, { body: { body, resolve } });
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusy(null);
    }
  }

  async function markResolved() {
    setError(null);
    setBusy("resolve");
    try {
      await api(`/api/admin/support/${ticketId}`, { body: { body: "(marked resolved)", resolve: true } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-extrabold text-ink">
        {resolved ? "Reopen with a reply" : "Reply to customer"}
      </h2>
      <textarea
        className="input mt-3"
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type your reply — the customer sees it instantly in their conversation…"
      />
      {error ? <p className="field-error">{error}</p> : null}
      <div className="flex justify-end gap-2 mt-3">
        {!resolved ? (
          <button className="btn btn-md btn-outline" onClick={markResolved} disabled={busy !== null}>
            <Check className="w-4 h-4" /> Mark resolved
          </button>
        ) : null}
        <button className="btn btn-md btn-primary" onClick={() => send(false)} disabled={busy !== null || !body.trim()}>
          {busy === "reply" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send reply
        </button>
      </div>
    </div>
  );
}
