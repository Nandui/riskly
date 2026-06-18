"use client";

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Input, Textarea, Select, Field } from "@/components/ui/form";
import { RISK_CATEGORIES } from "@/lib/constants";
import {
  riskScore,
  bandMeta,
  likelihoodLabel,
  severityLabel,
  SEVERITY_DESCRIPTIONS,
  type BandMeta,
} from "@/lib/risk";
import { cn } from "@/lib/utils";

const RATINGS = [1, 2, 3, 4, 5];

export interface HazardDraft {
  key: string;
  hazard: string;
  riskFactor: string;
  personAtRisk: string;
  consequence: string;
  currentControls: string;
  likelihood: number;
  severity: number;
  riskCategory: string;
}

export function newHazard(): HazardDraft {
  return {
    key:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    hazard: "",
    riskFactor: "",
    personAtRisk: "",
    consequence: "",
    currentControls: "",
    likelihood: 2,
    severity: 3,
    riskCategory: "Physical",
  };
}

export function HazardEditor({
  hazards,
  onChange,
  errorIndexes,
}: {
  hazards: HazardDraft[];
  onChange: (hazards: HazardDraft[]) => void;
  errorIndexes?: Set<number>;
}) {
  const update = (i: number, patch: Partial<HazardDraft>) =>
    onChange(hazards.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const remove = (i: number) =>
    onChange(hazards.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= hazards.length) return;
    const copy = [...hazards];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  return (
    <div className="space-y-4">
      {hazards.length === 0 && (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 p-8 text-center text-sm text-muted-foreground">
          No hazards yet. Add the first hazard to start rating risk.
        </div>
      )}

      {hazards.map((h, i) => (
        <HazardCard
          key={h.key}
          hazard={h}
          index={i}
          total={hazards.length}
          hasError={errorIndexes?.has(i)}
          onUpdate={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
          onMove={(dir) => move(i, dir)}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange([...hazards, newHazard()])}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border-[1.5px] border-dashed border-line-strong bg-surface text-sm font-semibold text-primary transition-colors hover:bg-surface-2"
      >
        <Plus className="size-4" /> Add hazard
      </button>
    </div>
  );
}

function DotRow({
  label,
  value,
  meta,
}: {
  label: string;
  value: number;
  meta: BandMeta;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "w-[4.5rem] text-[0.625rem] font-bold uppercase tracking-wide",
          meta.text,
        )}
      >
        {label}
      </span>
      <div className="flex gap-1.5">
        {RATINGS.map((i) => (
          <span
            key={i}
            className={cn(
              "size-2 rounded-full",
              i <= value ? meta.dot : "bg-ink/15",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function HazardCard({
  hazard,
  index,
  total,
  hasError,
  onUpdate,
  onRemove,
  onMove,
}: {
  hazard: HazardDraft;
  index: number;
  total: number;
  hasError?: boolean;
  onUpdate: (patch: Partial<HazardDraft>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const score = riskScore(hazard.likelihood, hazard.severity);
  const meta = bandMeta(score);
  const title = hazard.hazard.trim() || `Hazard ${index + 1}`;

  const iconBtn =
    "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border bg-surface shadow-xs print-break-avoid",
        hasError ? "border-critical-line" : "border-line",
      )}
    >
      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-line bg-surface-2/50 px-4 py-3">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold tnum",
            meta.cell,
          )}
        >
          {index + 1}
        </span>
        <h3 className="min-w-0 flex-1 truncate font-semibold text-ink">
          {title}
        </h3>
        <button
          type="button"
          className={cn(
            iconBtn,
            "border-line-strong text-muted-foreground hover:bg-surface hover:text-ink",
          )}
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move up"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          className={cn(
            iconBtn,
            "border-line-strong text-muted-foreground hover:bg-surface hover:text-ink",
          )}
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label="Move down"
        >
          <ChevronDown className="size-4" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, "border-critical-line text-critical hover:bg-critical-bg")}
          onClick={onRemove}
          aria-label="Remove hazard"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* body */}
      <div className="grid gap-6 p-4 lg:grid-cols-[1fr_340px]">
        {/* left: descriptive */}
        <div className="space-y-3.5">
          <Field label="Hazard" required>
            <Input
              value={hazard.hazard}
              onChange={(e) => onUpdate({ hazard: e.target.value })}
              placeholder="e.g. Uneven pitch surface / holes"
            />
          </Field>
          <Field label="Risk factor">
            <Textarea
              value={hazard.riskFactor}
              onChange={(e) => onUpdate({ riskFactor: e.target.value })}
              rows={2}
              placeholder="What causes the harm?"
            />
          </Field>
          <Field label="Person at risk">
            <Input
              value={hazard.personAtRisk}
              onChange={(e) => onUpdate({ personAtRisk: e.target.value })}
              placeholder="Staff / Customers / Visitors / Contractors"
            />
          </Field>
          <Field label="Consequence">
            <Textarea
              value={hazard.consequence}
              onChange={(e) => onUpdate({ consequence: e.target.value })}
              rows={2}
              placeholder="What is the outcome / injury?"
            />
          </Field>
          <Field label="Current controls" hint="One control per line.">
            <Textarea
              value={hazard.currentControls}
              onChange={(e) => onUpdate({ currentControls: e.target.value })}
              rows={3}
              placeholder="What is already in place to reduce the risk?"
            />
          </Field>
        </div>

        {/* right: risk rating */}
        <div className="space-y-3.5">
          <div className="rounded-xl border border-line bg-surface-2/50 p-4">
            <p className="eyebrow mb-3">Risk rating</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Likelihood">
                <Select
                  value={String(hazard.likelihood)}
                  onChange={(e) =>
                    onUpdate({ likelihood: Number(e.target.value) })
                  }
                >
                  {RATINGS.map((n) => (
                    <option key={n} value={n}>
                      {n} — {likelihoodLabel(n)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Severity">
                <Select
                  value={String(hazard.severity)}
                  onChange={(e) =>
                    onUpdate({ severity: Number(e.target.value) })
                  }
                >
                  {RATINGS.map((n) => (
                    <option key={n} value={n}>
                      {n} — {severityLabel(n)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              {SEVERITY_DESCRIPTIONS[hazard.severity - 1]}
            </p>
          </div>

          {/* live overall risk */}
          <div className={cn("rounded-xl p-4", meta.cell)}>
            <div className="flex items-center gap-3.5">
              <span className="font-mono text-4xl font-bold leading-none tnum">
                {score}
              </span>
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-wider opacity-80">
                  Overall risk · L×S
                </p>
                <p className="text-lg font-bold leading-tight">{meta.label}</p>
              </div>
            </div>
            <div className="mt-3.5 space-y-1.5">
              <DotRow label="Likelihood" value={hazard.likelihood} meta={meta} />
              <DotRow label="Severity" value={hazard.severity} meta={meta} />
            </div>
          </div>

          <Field label="Risk category">
            <Select
              value={hazard.riskCategory}
              onChange={(e) => onUpdate({ riskCategory: e.target.value })}
            >
              {RISK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );
}
