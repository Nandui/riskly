// ------------------------------------------------------------------
// The 5x5 risk engine — the single source of truth for scoring & bands.
// Score = Likelihood (1-5) x Severity (1-5)  ->  1..25
// Bands: Low 1-4 | Medium 5-9 | High 10-15 | Critical 16-25
// ------------------------------------------------------------------

export type RiskBand = "low" | "medium" | "high" | "critical";

export const RISK_BANDS: RiskBand[] = ["low", "medium", "high", "critical"];

// 1..5 scale descriptors (index 0 = rating 1)
export const LIKELIHOOD_LABELS = [
  "Rare",
  "Unlikely",
  "Possible",
  "Likely",
  "Almost certain",
] as const;

export const SEVERITY_LABELS = [
  "Negligible",
  "Minor",
  "Moderate",
  "Major",
  "Catastrophic",
] as const;

export function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function likelihoodLabel(n: number): string {
  return LIKELIHOOD_LABELS[clampRating(n) - 1];
}

export function severityLabel(n: number): string {
  return SEVERITY_LABELS[clampRating(n) - 1];
}

export function riskScore(likelihood: number, severity: number): number {
  return clampRating(likelihood) * clampRating(severity);
}

export function riskBand(score: number): RiskBand {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 15) return "high";
  return "critical";
}

export function bandFromRatings(likelihood: number, severity: number): RiskBand {
  return riskBand(riskScore(likelihood, severity));
}

export interface BandMeta {
  key: RiskBand;
  label: string;
  range: string;
  badge: string; // soft pill: tinted bg + coloured text + border
  solid: string; // strong fill + white text
  cell: string; // matrix-cell tint
  text: string;
  dot: string;
}

export const BAND_META: Record<RiskBand, BandMeta> = {
  low: {
    key: "low",
    label: "Low",
    range: "1–4",
    badge: "bg-low-bg text-low border border-low-line",
    solid: "bg-low text-white",
    cell: "bg-low-bg text-low",
    text: "text-low",
    dot: "bg-low",
  },
  medium: {
    key: "medium",
    label: "Medium",
    range: "5–9",
    badge: "bg-medium-bg text-medium border border-medium-line",
    solid: "bg-medium text-white",
    cell: "bg-medium-bg text-medium",
    text: "text-medium",
    dot: "bg-medium",
  },
  high: {
    key: "high",
    label: "High",
    range: "10–15",
    badge: "bg-high-bg text-high border border-high-line",
    solid: "bg-high text-white",
    cell: "bg-high-bg text-high",
    text: "text-high",
    dot: "bg-high",
  },
  critical: {
    key: "critical",
    label: "Critical",
    range: "16–25",
    badge: "bg-critical-bg text-critical border border-critical-line",
    solid: "bg-critical text-white",
    cell: "bg-critical-bg text-critical",
    text: "text-critical",
    dot: "bg-critical",
  },
};

export function bandMeta(scoreOrBand: number | RiskBand): BandMeta {
  const band =
    typeof scoreOrBand === "number" ? riskBand(scoreOrBand) : scoreOrBand;
  return BAND_META[band];
}

export interface MatrixCell {
  likelihood: number;
  severity: number;
  score: number;
  band: RiskBand;
}

// 5x5 grid for rendering: rows = likelihood 5 (top) → 1 (bottom), cols = severity 1 → 5.
export function buildMatrix(): MatrixCell[][] {
  const rows: MatrixCell[][] = [];
  for (let l = 5; l >= 1; l--) {
    const row: MatrixCell[] = [];
    for (let s = 1; s <= 5; s++) {
      const score = l * s;
      row.push({ likelihood: l, severity: s, score, band: riskBand(score) });
    }
    rows.push(row);
  }
  return rows;
}
