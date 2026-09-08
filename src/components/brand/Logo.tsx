import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3aa335" />
          <stop offset="1" stopColor="#1d571c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <path
        d="M40.5 24.5a11.5 11.5 0 1 0 0 15"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d="M46.5 18.5a20 20 0 1 0 0 27"
        fill="none"
        stroke="#bde6b6"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

export function Logo({
  name,
  light = false,
  size = 36,
}: {
  name: string;
  light?: boolean;
  size?: number;
}) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group" aria-label={`${name} — home`}>
      <LogoMark size={size} />
      <span className="leading-tight">
        <span
          className={`block font-extrabold tracking-tight text-[15px] ${
            light ? "text-white" : "text-ink"
          }`}
        >
          {name.split(" ")[0]} <span className={light ? "text-brand-300" : "text-brand-600"}>
            {name.split(" ").slice(1).join(" ")}
          </span>
        </span>
        <span
          className={`block text-[10px] font-semibold uppercase tracking-[0.16em] ${
            light ? "text-white/60" : "text-ink-mute"
          }`}
        >
          Safaricom Products
        </span>
      </span>
    </Link>
  );
}
