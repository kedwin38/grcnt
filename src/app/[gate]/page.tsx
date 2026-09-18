import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { currentUser } from "@/lib/session";
import { env } from "@/lib/env";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

// The staff/admin sign-in page deliberately does not live at a guessable URL
// like /admin/login — everything under /admin 404s for anyone without a
// session (see middleware.ts), so this single, otherwise-unremarkable path
// segment is the only door in. Anything that doesn't match the configured
// secret just 404s exactly like every other unknown route on the site.
export default async function GatePage({
  params,
}: {
  params: Promise<{ gate: string }>;
}) {
  const { gate } = await params;
  if (gate !== env.adminLoginPath) notFound();

  const user = await currentUser();
  if (user && (user.role === "ADMIN" || user.role === "STAFF")) redirect("/admin");

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-600/25 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-brand-800/50 blur-3xl" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5">
            <LogoMark size={40} />
            <span className="text-white font-extrabold text-lg tracking-tight">
              Green Color Networks
            </span>
          </div>
          <p className="text-white/60 text-sm mt-2">Back office — staff sign in</p>
        </div>
        <div className="card p-7">
          <AdminLoginForm />
        </div>
        <p className="text-center text-white/40 text-xs mt-5">
          Restricted area. All actions are audit-logged.
        </p>
      </div>
    </div>
  );
}
