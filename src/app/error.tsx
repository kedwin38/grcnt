"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl">
          🛠️
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink mt-6">
          Something went wrong
        </h1>
        <p className="text-ink-soft mt-3 leading-relaxed">
          An unexpected error occurred on our side — not anything you did. Try again,
          and if it persists our support team will jump on it.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn btn-lg btn-primary">
            Try again
          </button>
          <a href="/support" className="btn btn-lg btn-outline">
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
