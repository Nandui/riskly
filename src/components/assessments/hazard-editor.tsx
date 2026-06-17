"use client";

import { Plus, Trash2, ChevronUp, ChevronDown, TriangleAlert } from "lucide-react";
import { RiskMatrixPicker } from "@/components/risk-matrix";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/form";
import { ACTION_STATUSES } from "@/lib/constants";
import { riskScore } from "@/lib/risk";
import { cn } from "@/lib/utils";

export interface HazardDraft {
  key: string;
  hazardDescription: string;
  whoAtRisk: string;
  existingControls: string;
  initialLikelihood: number;
  initialSeverity: number;
  additionalControls: string;
  residualLikelihood: number;
  residualSeverity: number;
  actionOwnerName: string;
  actionDueDate: string;
  actionStatus: string;
}

export function newHazard(): HazardDraft {
  return {
    key:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    hazardDescription: "",
    whoAtRisk: "",
    existingControls: "",
    initialLikelihood: 3,
    initialSeverity: 3,
    additionalControls: "",
    residualLikelihood: 2,
    residualSeverity: 2,
    actionOwnerName: "",
    actionDueDate: "",
    actionStatus: "NA",
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
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 p-8 text-center text-sm text-muted">
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
  const initialScore = riskScore(hazard.initialLikelihood, hazard.initialSeverity);
  const residualScore = riskScore(
    hazard.residualLikelihood,
    hazard.residualSeverity,
  );
  const residualHigher = residualScore > initialScore;

  const iconBtn =
    "flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

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
            <Textarea
              value={hazard.hazardDescription}
              onChange={(e) => onUpdate({ hazardDescription: e.target.value })}
              rows={2}
              placeholder="What could cause harm?"
            />
          </Field>
          <Field label="Who might be harmed & how">
            <Textarea
              value={hazard.whoAtRisk}
              onChange={(e) => onUpdate({ whoAtRisk: e.target.value })}
              rows={2}
              placeholder="Staff, public, contractors…"
            />
          </Field>
          <Field label="Existing controls">
            <Textarea
              value={hazard.existingControls}
              onChange={(e) => onUpdate({ existingControls: e.target.value })}
              rows={3}
              placeholder="Measures already in place"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface-2/50 p-3">
            <RiskMatrixPicker
              label="Initial"
              likelihood={hazard.initialLikelihood}
              severity={hazard.initialSeverity}
              onChange={(l, s) =>
                onUpdate({ initialLikelihood: l, initialSeverity: s })
              }
            />
            <RiskMatrixPicker
              label="Residual"
              likelihood={hazard.residualLikelihood}
              severity={hazard.residualSeverity}
              onChange={(l, s) =>
                onUpdate({ residualLikelihood: l, residualSeverity: s })
              }
            />
          </div>
          {residualHigher && (
            <p className="flex items-center gap-1.5 text-xs text-medium">
              <TriangleAlert className="size-3.5" />
              Residual risk is higher than the initial rating — check your
              ratings.
            </p>
          )}
          <Field label="Additional controls needed">
            <Textarea
              value={hazard.additionalControls}
              onChange={(e) => onUpdate({ additionalControls: e.target.value })}
              rows={2}
              placeholder="Further action to reduce risk"
            />
          </Field>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
        <Field label="Action owner">
          <Input
            value={hazard.actionOwnerName}
            onChange={(e) => onUpdate({ actionOwnerName: e.target.value })}
            placeholder="Who is responsible?"
          />
        </Field>
        <Field label="Action due">
          <Input
            type="date"
            value={hazard.actionDueDate}
            onChange={(e) => onUpdate({ actionDueDate: e.target.value })}
          />
        </Field>
        <Field label="Action status">
          <Select
            value={hazard.actionStatus}
            onChange={(e) => onUpdate({ actionStatus: e.target.value })}
          >
            {ACTION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}
