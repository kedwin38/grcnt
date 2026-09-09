import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Timer, BadgeCheck } from "lucide-react";
import { currentUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  const { next } = await searchParams;
  if (user) redirect(next || "/orders");

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
