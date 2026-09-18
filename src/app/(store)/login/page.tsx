import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ShieldCheck, Timer, BadgeCheck } from "lucide-react";
import { currentUser } from "@/lib/session";
import { googleOAuthEnabled } from "@/lib/env";
import { GoogleButton } from "@/components/GoogleButton";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up yet.",
  google_failed: "Something went wrong with Google sign-in. Please try again.",
  google_no_email: "We couldn't get a verified email from your Google account.",
  google_not_allowed: "This Google account can't be used to sign in here.",
  too_many_attempts: "Too many attempts. Please wait a moment and try again.",
  account_disabled: "This account has been disabled.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await currentUser();
  const { next, error } = await searchParams;
  if (user) redirect(next || "/orders");
  const errorMessage = error ? OAUTH_ERRORS[error] || "Something went wrong. Please try again." : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <div className="hidden lg:block animate-fade-up">
          <h1 className="hero-title text-3xl text-ink">
            Welcome back to <span className="text-brand-600 italic">green</span>.
          </h1>
          <p className="text-ink-soft mt-3 leading-relaxed max-w-md">
            Log in to track your orders, repeat past purchases in one tap and reach
            our support team faster.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: ShieldCheck, text: "Your details stay yours — we never share them." },
              { icon: Timer, text: "Instant M-Pesa checkout with saved details." },
              { icon: BadgeCheck, text: "Order history and live delivery status." },
            ].map((row) => (
              <li key={row.text} className="flex items-center gap-3 text-ink-soft">
                <span className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                  <row.icon className="w-4.5 h-4.5 text-brand-600" />
                </span>
                <span className="text-[15px]">{row.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-7 sm:p-8 animate-fade-in">
          <h2 className="text-2xl font-extrabold tracking-tight">Log in</h2>
          <p className="text-ink-soft text-sm mt-1">Use your phone number and password.</p>
          {errorMessage ? (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {errorMessage}
            </div>
          ) : null}
          {googleOAuthEnabled ? (
            <div className="mt-6">
              <GoogleButton next={next || "/orders"} />
              <div className="flex items-center gap-3 my-5">
                <span className="h-px bg-black/10 flex-1" />
                <span className="text-[12px] font-semibold text-ink-mute uppercase tracking-wide">or use your phone</span>
                <span className="h-px bg-black/10 flex-1" />
              </div>
            </div>
          ) : null}
          <LoginForm next={next || "/orders"} />
          <p className="text-sm text-ink-soft mt-6 text-center">
            New here?{" "}
            <Link
              href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-bold text-brand-700 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
