"use client";

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/form";
import { RiskGauge } from "@/components/ui/risk-gauge";
import { RISK_CATEGORIES } from "@/lib/constants";
import {
  riskScore,
  likelihoodLabel,
  severityLabel,
  SEVERITY_DESCRIPTIONS,
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

      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...hazards, newHazard()])}
        className="w-full border-dashed"
      >
        <Plus className="size-4" /> Add hazard
      </Button>
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
  const iconBtn =
    "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border bg-surface p-4 shadow-xs sm:p-5",
        hasError ? "border-critical-line" : "border-line",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft text-xs font-bold tnum text-brand">
            {index + 1}
          </span>
          Hazard
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className={iconBtn}
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            className={cn(iconBtn, "hover:bg-critical-bg hover:text-critical")}
            onClick={onRemove}
            aria-label="Remove hazard"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
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
        </div>

        <div className="space-y-3">
          <div className="space-y-3 rounded-lg border border-line bg-surface-2/50 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <Field label="Consequence severity">
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              {SEVERITY_DESCRIPTIONS[hazard.severity - 1]}
            </p>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Overall risk
                </p>
                <p className="text-[0.7rem] text-faint">Likelihood × severity</p>
              </div>
              <RiskGauge score={riskScore(hazard.likelihood, hazard.severity)} />
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

      <div className="mt-3">
        <Field label="Current controls">
          <Textarea
            value={hazard.currentControls}
            onChange={(e) => onUpdate({ currentControls: e.target.value })}
            rows={3}
            placeholder="Measures already in place that the rating reflects"
          />
        </Field>
      </div>
    </div>
  );
}
