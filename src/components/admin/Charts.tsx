"use client";

// Lightweight dependency-free SVG charts for the admin dashboard.

export function RevenueBars({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / Math.max(data.length, 1);
  const hover = (d: { label: string; value: number }) =>
    `${d.label}: KSh ${d.value.toLocaleString("en-KE")}`;

  return (
    <div>
      <svg viewBox="0 0 100 42" className="w-full h-40" role="img" aria-label="Revenue chart">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2="100"
            y1={36 - 32 * f}
            y2={36 - 32 * f}
            stroke="var(--color-line)"
            strokeWidth="0.2"
          />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * 32;
          return (
            <g key={d.label}>
              <rect
                x={i * barW + barW * 0.18}
                y={36 - h}
                width={barW * 0.64}
                height={Math.max(h, 0.3)}
                rx="0.8"
                fill={i === data.length - 1 ? "var(--color-brand-500)" : "var(--color-brand-300)"}
              >
                <title>{hover(d)}</title>
              </rect>
            </g>
          );
        })}
        <line x1="0" x2="100" y1="36" y2="36" stroke="var(--color-line)" strokeWidth="0.3" />
      </svg>
      <div className="flex justify-between text-[10px] text-ink-mute font-semibold mt-1">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function StatusDonut({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((n, d) => n + d.value, 0);
  let offset = 0;
  const R = 15.9155; // circumference = 100
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 42 42" className="w-28 h-28 shrink-0" role="img" aria-label="Orders by status">
        <circle cx="21" cy="21" r={R} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        {total > 0 &&
          data.map((d) => {
            const frac = d.value / total;
            const dash = frac * 100;
            const el = (
              <circle
                key={d.label}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                stroke={d.color}
                strokeWidth="6"
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 21 21)"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            );
            offset += dash;
            return el;
          })}
        <text
          x="21"
          y="22.5"
          textAnchor="middle"
          className="fill-ink font-extrabold"
          style={{ fontSize: 8 }}
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5 text-[13px] min-w-0">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-ink-soft">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="flex-1">{d.label}</span>
            <span className="font-bold text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
