import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Headset, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getSettingGroup } from "@/lib/settings";
import { formatKES, prettyPhone } from "@/lib/format";
import { NewTicketForm } from "./NewTicketForm";

export const metadata: Metadata = {
  title: "Support",
  description: "Talk to the Green Color Networks support team — we usually reply within minutes.",
};

export default async function SupportPage() {
  const [business, user] = await Promise.all([
    getSettingGroup("business"),
    currentUser(),
  ]);

  const tickets = user
    ? await db.supportTicket.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
          <Headset className="w-7 h-7 text-brand-600" />
        </div>
        <h1 className="section-title mt-4">How can we help?</h1>
        <p className="text-ink-soft mt-1.5 text-[15px] max-w-lg mx-auto">
          Send us a message and our team replies right here on the site. You can also
          call {prettyPhone(business.phone)} or walk into our shop — {business.location}.
        </p>
      </div>

      <div className="mt-10 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div>
          <NewTicketForm
            defaultName={user?.name || ""}
            defaultPhone={user?.phone ? prettyPhone(user.phone) : ""}
            loggedIn={!!user}
          />

          {user ? (
            <section className="mt-8">
              <h2 className="font-extrabold text-ink">My conversations</h2>
              {tickets.length === 0 ? (
                <p className="text-ink-soft text-sm mt-2">
                  No messages yet — when you send one, it appears here with our replies.
                </p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {tickets.map((t) => (
                    <Link
                      key={t.id}
                      href={`/support/${t.code}?phone=${t.phone}`}
                      className="card card-hover p-4 flex items-center gap-3"
                    >
                      <MessageSquare className="w-5 h-5 text-brand-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm truncate">{t.subject}</div>
                        <div className="text-[12px] text-ink-mute">
                          {t.code} · updated {new Date(t.updatedAt).toLocaleDateString("en-KE")}
                        </div>
                      </div>
                      {t.status === "NEW" ? (
                        <span className="badge badge-amber">Sent</span>
                      ) : t.status === "OPEN" ? (
                        <span className="badge badge-blue">In conversation</span>
                      ) : (
                        <span className="badge badge-green">Resolved</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-ink-mute" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>

        <aside className="card p-6 space-y-5">
          <h2 className="font-extrabold text-ink">Reach us faster</h2>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">Call / SMS</div>
            <a href={`tel:+${business.phone}`} className="font-bold text-ink hover:text-brand-700">
              {prettyPhone(business.phone)}
            </a>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">WhatsApp</div>
            <a
              href={`https://wa.me/${business.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink hover:text-brand-700"
            >
              Chat now
            </a>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">Visit us</div>
            <div className="text-sm text-ink-soft">{business.location}</div>
            <div className="text-[13px] text-ink-mute">{business.openHours}</div>
          </div>
          <div className="pt-4 border-t border-line">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">M-Pesa Till</div>
            <div className="font-extrabold text-ink">{business.tillNumber}</div>
            <p className="text-[12px] text-ink-mute mt-1 leading-relaxed">
              For orders on this site, always pay through checkout — not the till
              directly — so your payment links to your order automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
