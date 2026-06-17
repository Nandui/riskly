import { bandMeta, riskScore, type RiskBand } from "@/lib/risk";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  likelihood?: number;
  severity?: number;
  score?: number;
  band?: RiskBand;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

// Compact risk chip: mono score + band label, coloured by band.
export function RiskBadge({
  likelihood,
  severity,
  score,
  band,
  showLabel = true,
  size = "md",
  className,
}: RiskBadgeProps) {
  const value =
    score ??
    (likelihood != null && severity != null
      ? riskScore(likelihood, severity)
      : undefined);
  const meta = bandMeta(band ?? value ?? 1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium",
        meta.badge,
        size === "sm" ? "px-1.5 py-0.5 text-[0.6875rem]" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      {value != null && (
        <span className="font-mono font-semibold tnum">{value}</span>
      )}
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
