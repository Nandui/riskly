"use client";

import { Fragment, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { triageIncident } from "@/lib/actions/incidents";
import {
  HAZARD_CATEGORIES,
  INCIDENT_SEVERITIES,
  INCIDENT_TYPES,
  SUPERVISION_CAUSES,
} from "@/lib/incidents/constants";
import {
  LIKELIHOOD_LABELS,
  SEVERITY_LABELS,
  bandMeta,
  buildMatrix,
  riskScore,
} from "@/lib/risk";
import type { FormState } from "@/lib/form";
import { cn } from "@/lib/utils";

const MATRIX = buildMatrix();
const RATING_OPTIONS = [1, 2, 3, 4, 5];

export function TriageForm({
  incidentId,
  defaultType,
  defaultSeverity,
}: {
  incidentId: string;
  defaultType: string;
  defaultSeverity: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    triageIncident,
    null,
  );
  const fe = state?.fieldErrors ?? {};

  const [type, setType] = useState(defaultType);
  const [likelihood, setLikelihood] = useState(3);
  const [consequence, setConsequence] = useState(3);

  const score = riskScore(likelihood, consequence);
  const band = bandMeta(score);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Incident triaged.");
      router.push(`/incidents/${incidentId}`);
      router.refresh();
    }
  }, [state, router, incidentId]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="incidentId" value={incidentId} />
      <input type="hidden" name="potentialLikelihood" value={likelihood} />
      <input type="hidden" name="potentialConsequence" value={consequence} />

      {state && !state.ok && state.error && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-card)] border border-critical-line bg-critical-bg px-4 py-3 text-sm text-critical">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {/* Confirm the classification + the actual outcome */}
      <Card>
        <CardHeader>
          <CardTitle>Confirm the report</CardTitle>
        </CardHeader>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Type" htmlFor="type" error={fe.type} required>
            <Select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Actual outcome (severity)"
            htmlFor="severity"
            hint="What actually happened to anyone involved."
            error={fe.severity}
            required
          >
            <Select id="severity" name="severity" defaultValue={defaultSeverity}>
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Hazard category"
            htmlFor="hazardCategory"
            hint="Optional — the underlying hazard class."
          >
            <Select id="hazardCategory" name="hazardCategory" defaultValue="">
              <option value="">Not set</option>
              {HAZARD_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          {type === "DangerousOccurrence" && (
            <Field
              label="Defined dangerous occurrence?"
              hint="A specifically defined, HSA-reportable event."
            >
              <label className="flex h-10 items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="definedDangerousOccurrence"
                  value="true"
                  className="size-4 rounded border-line-strong"
                />
                Yes — this meets a defined dangerous-occurrence type
              </label>
            </Field>
          )}

          {type === "MissingChild" && (
            <Field
              label="Supervision cause"
              hint="The control/policy root cause in non-welfare terms — any child-welfare concern goes to the DLP, not here."
              className="sm:col-span-2"
            >
              <Select name="supervisionCause" defaultValue="">
                <option value="">Not set</option>
                {SUPERVISION_CAUSES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field
            label="HSA-reportable?"
            hint="Advisory only — confirm against the HSA criteria; this is a recorded decision, not an automatic determination."
            className="sm:col-span-2"
          >
            <label className="flex h-10 items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="hsaReportable"
                value="true"
                className="size-4 rounded border-line-strong"
              />
              Flag this incident as HSA-reportable
            </label>
          </Field>
        </div>
      </Card>

      {/* Potential risk — the 5×5 (likelihood × consequence) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Potential risk</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Had things gone differently, how bad could this realistically have
              been? Likelihood × consequence — the same scale as risk assessments.
            </p>
          </div>
        </CardHeader>
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Likelihood" htmlFor="likelihoodSel">
              <Select
                id="likelihoodSel"
                value={likelihood}
                onChange={(e) => setLikelihood(Number(e.target.value))}
              >
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} — {LIKELIHOOD_LABELS[n - 1]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Consequence severity" htmlFor="consequenceSel">
              <Select
                id="consequenceSel"
                value={consequence}
                onChange={(e) => setConsequence(Number(e.target.value))}
              >
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} — {SEVERITY_LABELS[n - 1]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <div
                className={cn(
                  "flex items-center justify-between rounded-[var(--radius-card)] px-4 py-3 text-sm font-medium",
                  band.badge,
                )}
              >
                <span>Potential risk</span>
                <span className="tnum">
                  {likelihood} × {consequence} = {score} · {band.label}
                </span>
              </div>
            </div>
          </div>

          {/* Selectable 5×5 — click a cell to set likelihood × consequence */}
          <div className="select-none">
            <div className="grid grid-cols-[1.1rem_repeat(5,2rem)] gap-1">
              <div />
              {[1, 2, 3, 4, 5].map((s) => (
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
                      const m = bandMeta(cell.band);
                      const selected =
                        cell.likelihood === likelihood &&
                        cell.severity === consequence;
                      return (
                        <button
                          key={cell.severity}
                          type="button"
                          title={`L${cell.likelihood} × S${cell.severity} = ${cell.score}`}
                          onClick={() => {
                            setLikelihood(cell.likelihood);
                            setConsequence(cell.severity);
                          }}
                          className={cn(
                            "flex aspect-square items-center justify-center rounded text-[0.7rem] font-semibold tnum transition",
                            m.cell,
                            selected
                              ? "ring-2 ring-ink ring-offset-1 ring-offset-surface"
                              : "opacity-55 hover:opacity-100",
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
            <p className="mt-2 text-center text-[0.625rem] uppercase tracking-wider text-faint">
              Likelihood ↕ · Severity ↔
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/incidents/${incidentId}`)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Complete triage"}
        </Button>
      </div>
    </form>
  );
}
