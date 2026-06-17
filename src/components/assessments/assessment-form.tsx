"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Button, buttonClasses } from "@/components/ui/button";
import { HazardEditor, type HazardDraft } from "./hazard-editor";
import { ASSESSMENT_STATUSES, REVIEW_FREQUENCY_OPTIONS } from "@/lib/constants";
import type { FormState } from "@/lib/form";

interface Option {
  id: string;
  name: string;
}

export interface AssessmentDefaults {
  title: string;
  description: string;
  centerId: string;
  areaId: string;
  roleId: string;
  activityId: string;
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
  const [areaId, setAreaId] = useState(defaults.areaId);
  const [hazards, setHazards] = useState<HazardDraft[]>(defaults.hazards);

  const areaOptions = areasByCenter[centerId] ?? [];

  const onCenterChange = (id: string) => {
    setCenterId(id);
    const list = areasByCenter[id] ?? [];
    if (!list.some((a) => a.id === areaId)) setAreaId("");
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
      <input type="hidden" name="areaId" value={areaId} />

      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-ink">Classification</h2>

        <Field label="Title" required error={fe.title}>
          <Input
            name="title"
            defaultValue={defaults.title}
            placeholder="e.g. Pool supervision & drowning prevention"
          />
        </Field>

        <Field label="Scope / description" error={fe.description}>
          <Textarea
            name="description"
            defaultValue={defaults.description}
            rows={2}
            placeholder="What does this assessment cover?"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
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

          <Field label="Area" required error={fe.areaId}>
            <Select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              disabled={!centerId}
            >
              <option value="">
                {centerId ? "Select an area…" : "Choose a centre first"}
              </option>
              {areaOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Role" error={fe.roleId}>
            <Select name="roleId" defaultValue={defaults.roleId}>
              <option value="">— None —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Activity" error={fe.activityId}>
            <Select name="activityId" defaultValue={defaults.activityId}>
              <option value="">— None —</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
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
          <Field label="Approved by" error={fe.approvedByName}>
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
              Click a matrix cell to set likelihood × severity for each hazard.
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
