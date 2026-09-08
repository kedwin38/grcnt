import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { prettyPhone } from "@/lib/format";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
      <h1 className="section-title">My profile</h1>
      <p className="text-ink-soft mt-1">
        Signed in as <span className="font-semibold text-ink">{prettyPhone(user.phone)}</span>
      </p>
      <ProfileForm name={user.name} email={user.email || ""} />
    </div>
  );
}
