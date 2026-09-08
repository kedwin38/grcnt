import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  const { next } = await searchParams;
  if (user) redirect(next || "/orders");

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-14">
      <div className="card p-7 sm:p-8 animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
        <p className="text-ink-soft text-sm mt-1">
          One phone number is all we need — no paperwork.
        </p>
        <RegisterForm next={next || "/orders"} />
        <p className="text-sm text-ink-soft mt-6 text-center">
          Already registered?{" "}
          <Link
            href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-bold text-brand-700 hover:underline"
          >
            Log in
          </Link>
        </p>
        <p className="text-[12px] text-ink-mute mt-4 text-center leading-relaxed">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
