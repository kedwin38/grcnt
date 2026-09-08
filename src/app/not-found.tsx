import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-brand-50 border border-brand-100 flex items-center justify-center">
          <Compass className="w-8 h-8 text-brand-600" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-ink mt-6">404</h1>
        <p className="text-ink-soft mt-3 leading-relaxed">
          That page wandered off the network. Let&apos;s get you back to somewhere
          useful.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-lg btn-primary">
            Go home
          </Link>
          <Link href="/shop" className="btn btn-lg btn-outline">
            Browse the shop
          </Link>
        </div>
      </div>
    </div>
  );
}
