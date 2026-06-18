"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Button, buttonClasses } from "@/components/ui/button";
import { HazardEditor, type HazardDraft } from "./hazard-editor";
import {
  ASSESSMENT_STATUSES,
  REVIEW_FREQUENCY_OPTIONS,
  SUBJECT_TYPES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form";

interface Option {
  id: string;
  name: string;
}

export interface AssessmentDefaults {
  description: string;
  centerId: string;
  subjectType: string;
  subjectId: string;
  status: string;
  assessorName: string;
  approvedByName: string;
  assessmentDate: string;
  reviewFrequencyMonths: number;
  hazards: HazardDraft[];
}

export function AssessmentForm({
  action,
  submitLabel,
  centers,
  areasByCenter,
  roles,
  activities,
  defaults,
  cancelHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  centers: Option[];
  areasByCenter: Record<string, Option[]>;
  roles: Option[];
  activities: Option[];
  defaults: AssessmentDefaults;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    null,
  );
  const fe = state?.fieldErrors ?? {};

  const [centerId, setCenterId] = useState(defaults.centerId);
  const [subjectType, setSubjectType] = useState(defaults.subjectType || "Area");
  const [subjectId, setSubjectId] = useState(defaults.subjectId);
  const [hazards, setHazards] = useState<HazardDraft[]>(defaults.hazards);

  const subjectOptions: Option[] =
    subjectType === "Area"
      ? (areasByCenter[centerId] ?? [])
      : subjectType === "Role"
        ? roles
        : activities;

  const subjectLabel =
    SUBJECT_TYPES.find((t) => t.value === subjectType)?.label ?? "Subject";

  const onCenterChange = (id: string) => {
    setCenterId(id);
    if (subjectType === "Area") {
      const list = areasByCenter[id] ?? [];
      if (!list.some((a) => a.id === subjectId)) setSubjectId("");
    }
  };

  const onSubjectTypeChange = (t: string) => {
    setSubjectType(t);
    setSubjectId("");
  };

  const serialized = useMemo(
    () => JSON.stringify(hazards.map(({ key, ...rest }) => rest)),
    [hazards],
  );

  const hazardErrorIdx = useMemo(() => {
    const set = new Set<number>();
    for (const k of Object.keys(fe)) {
      const m = k.match(/^hazards\.(\d+)/);
      if (m) set.add(Number(m[1]));
    }
    return set;
  }, [fe]);

  const cardClass =
    "space-y-5 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs sm:p-6";

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg border border-critical-line bg-critical-bg px-4 py-3 text-sm font-medium text-critical">
          {state.error}
        </div>
      )}

      <input type="hidden" name="hazards" value={serialized} />
      <input type="hidden" name="centerId" value={centerId} />
      <input type="hidden" name="subjectType" value={subjectType} />
      <input type="hidden" name="subjectId" value={subjectId} />

      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-ink">
          What is this assessment for?
        </h2>

        <Field label="Centre" required error={fe.centerId}>
          <Select
            value={centerId}
            onChange={(e) => onCenterChange(e.target.value)}
          >
            <option value="">Select a centre…</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">
            This assessment covers a…
          </label>
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
            {SUBJECT_TYPES.map((t) => {
              const active = subjectType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onSubjectTypeChange(t.value)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand text-white shadow-xs"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <Field
          label={subjectLabel}
          required
          error={fe.subjectId}
          hint="The assessment is named after this — all its hazards live inside it."
        >
          <Select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={subjectType === "Area" && !centerId}
          >
            <option value="">
              {subjectType === "Area" && !centerId
                ? "Choose a centre first"
                : `Select ${subjectLabel.toLowerCase()}…`}
            </option>
            {subjectOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Scope / description" error={fe.description}>
          <Textarea
            name="description"
            defaultValue={defaults.description}
            rows={2}
            placeholder="Optional notes on what this assessment covers"
          />
        </Field>
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-ink">Assessment record</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Status">
            <Select name="status" defaultValue={defaults.status}>
              {ASSESSMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assessment date" required error={fe.assessmentDate}>
            <Input
              type="date"
              name="assessmentDate"
              defaultValue={defaults.assessmentDate}
            />
          </Field>
          <Field label="Review frequency">
            <Select
              name="reviewFrequencyMonths"
              defaultValue={String(defaults.reviewFrequencyMonths)}
            >
              {REVIEW_FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assessed by" error={fe.assessorName}>
            <Input name="assessorName" defaultValue={defaults.assessorName} />
          </Field>
          <Field label="Verified / approved by" error={fe.approvedByName}>
            <Input
              name="approvedByName"
              defaultValue={defaults.approvedByName}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Hazards &amp; risk rating
            </h2>
            <p className="text-xs text-muted">
              Set the likelihood and consequence for each hazard — overall risk
              is calculated automatically.
            </p>
          </div>
          <span className="text-xs tnum text-muted">
            {hazards.length} {hazards.length === 1 ? "hazard" : "hazards"}
          </span>
        </div>
        {hazardErrorIdx.size > 0 && (
          <p className="text-xs font-medium text-critical">
            Some hazards need a description before saving.
          </p>
        )}
        <HazardEditor
          hazards={hazards}
          onChange={setHazards}
          errorIndexes={hazardErrorIdx}
        />
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-bg/85 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-b-[var(--radius-card)] sm:px-0">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonClasses({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
