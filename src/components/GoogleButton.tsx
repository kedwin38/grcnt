export function GoogleButton({ next, label = "Continue with Google" }: { next: string; label?: string }) {
  return (
    <a
      href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
      className="btn btn-lg w-full bg-white border border-black/10 text-ink hover:bg-black/[0.03] shadow-sm"
    >
      <svg viewBox="0 0 48 48" className="w-4.5 h-4.5" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.4 0-13.8 4.1-17.2 10.1z" />
        <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6c-2 1.5-4.6 2.5-7.6 2.5-5.3 0-9.7-3.4-11.3-8.1l-6.5 5c3.4 6.7 10.4 11.3 17.8 11.3z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.6 5.6C41.5 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
      </svg>
      {label}
    </a>
  );
}
