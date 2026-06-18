"use client";

import { Fragment } from "react";
import {
  buildMatrix,
  bandMeta,
  riskScore,
  likelihoodLabel,
  severityLabel,
} from "@/lib/risk";
import { RiskBadge } from "@/components/ui/risk-badge";
import { cn } from "@/lib/utils";

const MATRIX = buildMatrix(); // rows: likelihood 5 → 1, cols: severity 1 → 5
const SEVERITY = [1, 2, 3, 4, 5];

const gridCols = "grid grid-cols-[1.1rem_repeat(5,minmax(0,1fr))] gap-1";

/**
 * Interactive 5×5 matrix. Click a cell to set likelihood (row) × severity (col).
 * The matrix IS the rating control — one click sets both axes.
 */
export function RiskMatrixPicker({
  likelihood,
  severity,
  onChange,
  label,
}: {
  likelihood: number;
  severity: number;
  onChange: (likelihood: number, severity: number) => void;
  label?: string;
}) {
  const score = riskScore(likelihood, severity);

  return (
    <div className="select-none">
      {label && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
          </span>
          <RiskBadge score={score} size="sm" />
        </div>
      )}

      <div className={gridCols}>
        <div />
        {SEVERITY.map((s) => (
          <div
            key={s}
            className="text-center text-[0.625rem] font-semibold tnum text-faint"
          >
            {s}
          </div>
        ))}

        {MATRIX.map((row) => {
          const l = row[0].likelihood;
          return (
            <Fragment key={l}>
              <div className="flex items-center justify-center text-[0.625rem] font-semibold tnum text-faint">
                {l}
              </div>
              {row.map((cell) => {
                const selected =
                  cell.likelihood === likelihood && cell.severity === severity;
                const m = bandMeta(cell.band);
                return (
                  <button
                    key={cell.severity}
                    type="button"
                    onClick={() => onChange(cell.likelihood, cell.severity)}
                    aria-pressed={selected}
                    title={`Likelihood ${cell.likelihood} (${likelihoodLabel(cell.likelihood)}) × Severity ${cell.severity} (${severityLabel(cell.severity)}) = ${cell.score}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded text-[0.7rem] font-semibold tnum transition-all",
                      m.cell,
                      selected
                        ? "scale-[1.08] shadow ring-2 ring-ink"
                        : "opacity-70 hover:opacity-100",
                    )}
                  >
                    {cell.score}
                  </button>
                );
              })}
            </Fragment>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[0.7rem] text-muted">
        <span className="font-medium text-ink-soft">{likelihoodLabel(likelihood)}</span>
        {" × "}
        <span className="font-medium text-ink-soft">{severityLabel(severity)}</span>
      </p>
      <p className="text-center text-[0.6rem] uppercase tracking-wider text-faint">
        Likelihood ↕ · Severity ↔
      </p>
    </div>
  );
}

/**
 * Static heat-map of how many hazards fall in each cell. Used on the dashboard.
 */
export function RiskMatrixHeat({
  counts,
}: {
  counts: Record<string, number>; // key `${likelihood}-${severity}`
}) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="select-none">
      <div className={gridCols}>
        <div />
        {SEVERITY.map((s) => (
          <div
            key={s}
            className="text-center text-[0.625rem] font-semibold tnum text-faint"
          >
            {s}
          </div>
        ))}
        {MATRIX.map((row) => {
          const l = row[0].likelihood;
          return (
            <Fragment key={l}>
              <div className="flex items-center justify-center text-[0.625rem] font-semibold tnum text-faint">
                {l}
              </div>
              {row.map((cell) => {
                const n = counts[`${cell.likelihood}-${cell.severity}`] ?? 0;
                const m = bandMeta(cell.band);
                return (
                  <div
                    key={cell.severity}
                    title={`L${cell.likelihood} × S${cell.severity} — ${n} hazard${n === 1 ? "" : "s"}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded text-[0.75rem] font-semibold tnum",
                      m.cell,
                      n === 0 && "opacity-35",
                    )}
                    style={
                      n > 0
                        ? { outline: `${Math.round((n / max) * 2) + 0.5}px solid currentColor` }
                        : undefined
                    }
                  >
                    {n > 0 ? n : ""}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[0.625rem] uppercase tracking-wider text-faint">
        Overall risk · Likelihood ↕ · Severity ↔
      </p>
    </div>
  );
}
