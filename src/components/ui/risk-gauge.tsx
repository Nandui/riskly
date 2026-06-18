"use client";

import { riskBand, bandMeta } from "@/lib/risk";
import { cn } from "@/lib/utils";

// Top semicircle, centre (60,70), radius 48.
const ARC = "M 12 70 A 48 48 0 0 1 108 70";

// Band zones as fractions of the 1–25 scale (pathLength normalised to 100):
// Low 1–4, Medium 5–9, High 10–16, Very High 17–25.
// dash pattern "0 <gap> <len> 100" draws just that sub-arc.
const SEGMENTS = [
  { dash: "0 0 16 100", token: "--color-low" },
  { dash: "0 16 20 100", token: "--color-medium" },
  { dash: "0 36 28 100", token: "--color-high" },
  { dash: "0 64 36 100", token: "--color-critical" },
];

const BAND_TOKEN: Record<string, string> = {
  low: "--color-low",
  medium: "--color-medium",
  high: "--color-high",
  veryHigh: "--color-critical",
};

export function RiskGauge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const s = Math.max(0, Math.min(25, Math.round(score)));
  const p = s / 25;
  const band = riskBand(s || 1);
  const meta = bandMeta(band);
  const angle = (p - 0.5) * 180; // -90° (far left) … +90° (far right)
  const color = `var(${BAND_TOKEN[band]})`;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        viewBox="0 0 120 80"
        className="w-32"
        role="img"
        aria-label={`Overall risk ${s} out of 25, ${meta.label}`}
      >
        {SEGMENTS.map((seg) => (
          <path
            key={seg.token}
            d={ARC}
            fill="none"
            strokeWidth={9}
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray={seg.dash}
            style={{ stroke: `var(${seg.token})`, opacity: 0.85 }}
          />
        ))}

        {/* sweeping needle */}
        <g
          style={{
            transformBox: "view-box",
            transformOrigin: "60px 70px",
            transform: `rotate(${angle}deg)`,
            transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <line
            x1={60}
            y1={70}
            x2={60}
            y2={30}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ stroke: "var(--color-ink)" }}
          />
        </g>
        <circle cx={60} cy={70} r={5.5} style={{ fill: "var(--color-ink)" }} />
        <circle cx={60} cy={70} r={2} fill="#ffffff" />
      </svg>

      <div className="-mt-2 flex items-baseline gap-1.5 leading-none">
        <span
          className="font-mono text-xl font-bold tnum transition-colors"
          style={{ color }}
        >
          {s}
        </span>
        <span
          className="text-xs font-semibold transition-colors"
          style={{ color }}
        >
          {meta.label}
        </span>
      </div>
    </div>
  );
}
