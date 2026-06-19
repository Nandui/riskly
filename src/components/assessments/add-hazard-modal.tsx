"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { PersonAtRiskPicker } from "./person-at-risk-picker";
import { addHazard } from "@/lib/actions/assessments";
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

export function AddHazardButton({
  assessmentId,
  inForce,
}: {
  assessmentId: string;
  inForce: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses({ variant: "secondary", size: "sm" })}
      >
        <Plus className="size-4" /> Add New Hazard
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <AddHazardForm
            assessmentId={assessmentId}
            inForce={inForce}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddHazardForm({
  assessmentId,
  inForce,
  onDone,
}: {
  assessmentId: string;
  inForce: boolean;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addHazard.bind(null, assessmentId),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [likelihood, setLikelihood] = useState(2);
  const [severity, setSeverity] = useState(3);
  const [personAtRisk, setPersonAtRisk] = useState("");
  const fe = state?.fieldErrors ?? {};
  const score = riskScore(likelihood, severity);
  const meta = bandMeta(score);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <>
      <DialogHeader className="border-b border-line p-5 pr-12 text-left">
        <DialogTitle>Add new hazard</DialogTitle>
        <DialogDescription>
          {inForce
            ? "This assessment is approved — adding a hazard re-opens it for review and clears the current sign-off."
            : "Add a hazard to this assessment."}
        </DialogDescription>
      </DialogHeader>

      <form
        ref={formRef}
        action={formAction}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex-1 space-y-3.5 overflow-y-auto p-5">
          {state && !state.ok && state.error && (
            <p className="text-sm font-medium text-critical">{state.error}</p>
          )}

          <Field label="Hazard" required error={fe.hazard}>
            <Input
              name="hazard"
              placeholder="e.g. Uneven pitch surface / holes"
              autoFocus
              required
            />
          </Field>
          <Field label="Risk factor">
            <Textarea
              name="riskFactor"
              rows={2}
              placeholder="What causes the harm?"
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
              placeholder="What is the outcome / injury?"
            />
          </Field>
          <Field label="Current controls" hint="One control per line.">
            <Textarea
              name="currentControls"
              rows={3}
              placeholder="What is already in place to reduce the risk?"
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
            <Select name="riskCategory" defaultValue="Physical">
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
          {inForce ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                if (formRef.current?.reportValidity()) setConfirmOpen(true);
              }}
            >
              {pending ? "Adding…" : "Add hazard"}
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add hazard"}
            </Button>
          )}
        </DialogFooter>
      </form>

      {inForce && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Re-open this approved assessment?"
          description="Adding a hazard sends it back to Under review and clears the current Owner/CEO sign-off."
          confirmLabel="Add hazard"
          pendingLabel="Adding…"
          pending={pending}
          onConfirm={() => {
            setConfirmOpen(false);
            formRef.current?.requestSubmit();
          }}
        />
      )}
    </>
  );
}
