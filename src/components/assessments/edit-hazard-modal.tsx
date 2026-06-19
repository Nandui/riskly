"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { PersonAtRiskPicker } from "./person-at-risk-picker";
import { updateHazard } from "@/lib/actions/assessments";
import { RISK_CATEGORIES } from "@/lib/constants";
import {
  riskScore,
  bandMeta,
  likelihoodLabel,
  severityLabel,
  SEVERITY_DESCRIPTIONS,
} from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form";

const RATINGS = [1, 2, 3, 4, 5];

export interface EditableHazard {
  id: string;
  hazard: string;
  riskFactor: string | null;
  personAtRisk: string | null;
  consequence: string | null;
  currentControls: string | null;
  likelihood: number;
  severity: number;
  riskCategory: string;
}

export function EditHazardButton({ hazard }: { hazard: EditableHazard }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit hazard"
        title="Edit hazard"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
      >
        <Pencil className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {/* Remount the form per-open so it resets to the hazard's values. */}
          {open && (
            <EditHazardForm hazard={hazard} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditHazardForm({
  hazard,
  onDone,
}: {
  hazard: EditableHazard;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateHazard.bind(null, hazard.id),
    null,
  );
  const [likelihood, setLikelihood] = useState(hazard.likelihood);
  const [severity, setSeverity] = useState(hazard.severity);
  const [personAtRisk, setPersonAtRisk] = useState(hazard.personAtRisk ?? "");
  const fe = state?.fieldErrors ?? {};
  const score = riskScore(likelihood, severity);
  const meta = bandMeta(score);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <>
      <DialogHeader className="border-b border-line p-5 pr-12 text-left">
        <DialogTitle>Edit hazard</DialogTitle>
        <DialogDescription>
          Saving sends the assessment back to Under review and clears any
          approval.
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-3.5 overflow-y-auto p-5">
          {state && !state.ok && state.error && (
            <p className="text-sm font-medium text-critical">{state.error}</p>
          )}

          <Field label="Hazard" required error={fe.hazard}>
            <Input
              name="hazard"
              defaultValue={hazard.hazard}
              autoFocus
              required
            />
          </Field>
          <Field label="Risk factor">
            <Textarea
              name="riskFactor"
              rows={2}
              defaultValue={hazard.riskFactor ?? ""}
            />
          </Field>
          <Field label="Person at risk">
            <input type="hidden" name="personAtRisk" value={personAtRisk} />
            <PersonAtRiskPicker value={personAtRisk} onChange={setPersonAtRisk} />
          </Field>
          <Field label="Consequence">
            <Textarea
              name="consequence"
              rows={2}
              defaultValue={hazard.consequence ?? ""}
            />
          </Field>
          <Field label="Current controls" hint="One control per line.">
            <Textarea
              name="currentControls"
              rows={3}
              defaultValue={hazard.currentControls ?? ""}
            />
          </Field>

          <div className="rounded-xl border border-line bg-surface-2/50 p-4">
            <p className="eyebrow mb-3">Risk rating</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Likelihood">
                <Select
                  name="likelihood"
                  value={String(likelihood)}
                  onChange={(e) => setLikelihood(Number(e.target.value))}
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
                  name="severity"
                  value={String(severity)}
                  onChange={(e) => setSeverity(Number(e.target.value))}
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
              {SEVERITY_DESCRIPTIONS[severity - 1]}
            </p>
          </div>

          <div className={cn("flex items-center gap-3.5 rounded-xl p-4", meta.cell)}>
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

          <Field label="Risk category">
            <Select name="riskCategory" defaultValue={hazard.riskCategory}>
              {RISK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <DialogFooter className="border-t border-line p-4">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
