import { Fragment } from "react";
import { buildMatrix, bandMeta } from "@/lib/risk";
import { cn } from "@/lib/utils";

const MATRIX = buildMatrix(); // rows: likelihood 5 → 1, cols: severity 1 → 5
const SEVERITY = [1, 2, 3, 4, 5];
const gridCols = "grid grid-cols-[1.1rem_repeat(5,minmax(0,1fr))] gap-1";

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
