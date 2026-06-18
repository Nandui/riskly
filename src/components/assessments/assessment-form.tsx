"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Target,
  CalendarDays,
  TriangleAlert,
  Sparkles,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Button, buttonClasses } from "@/components/ui/button";
import { HazardEditor, newHazard, type HazardDraft } from "./hazard-editor";
import {
  ASSESSMENT_STATUSES,
  REVIEW_FREQUENCY_OPTIONS,
  SUBJECT_TYPES,
} from "@/lib/constants";
import { generateAssessmentHazards } from "@/lib/actions/ai-draft";
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
  assessmentDate: string;
  reviewFrequencyMonths: number;
  hazards: HazardDraft[];
  ownerId: string;
  departmentId: string;
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  tone = "accent",
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone?: "accent" | "danger";
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          tone === "danger"
            ? "bg-critical-bg text-critical"
            : "bg-accent text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function AssessmentForm({
  action,
  submitLabel,
  centers,
  areasByCenter,
  roles,
  activities,
  users,
  departments,
  defaults,
  cancelHref,
  takenAreaIds,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  centers: Option[];
  areasByCenter: Record<string, Option[]>;
  roles: Option[];
  activities: Option[];
  users: Option[];
  departments: Option[];
  defaults: AssessmentDefaults;
  cancelHref: string;
  takenAreaIds: string[];
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
  const [aiHint, setAiHint] = useState("");
  const [aiPending, startAi] = useTransition();

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

  const onGenerate = () => {
    if (!subjectId) {
      toast.error(`Choose a ${subjectLabel.toLowerCase()} first.`);
      return;
    }
    startAi(async () => {
      const res = await generateAssessmentHazards({
        centerId,
        subjectType: subjectType as "Area" | "Role" | "Activity",
        subjectId,
        hint: aiHint,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const drafted = res.hazards.map((h) => ({ ...newHazard(), ...h }));
      setHazards((prev) => [...prev, ...drafted]);
      setAiHint("");
      toast.success(
        `Added ${drafted.length} AI-drafted hazard${
          drafted.length === 1 ? "" : "s"
        } — review and edit each before saving.`,
      );
    });
  };

  const serialized = useMemo(
    () => JSON.stringify(hazards.map(({ key, ...rest }) => ({ id: key, ...rest }))),
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
        <SectionHeader
          icon={Target}
          title="Scope & coverage"
          subtitle="What is this assessment for?"
        />

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
          <div className="inline-flex gap-1 rounded-lg bg-surface-2 p-1">
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
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-ink",
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
            {subjectOptions.map((o) => {
              const taken =
                subjectType === "Area" && takenAreaIds.includes(o.id);
              return (
                <option key={o.id} value={o.id} disabled={taken}>
                  {o.name}
                  {taken ? " — already assessed" : ""}
                </option>
              );
            })}
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
        <SectionHeader
          icon={CalendarDays}
          title="Assessment record"
          subtitle="Ownership, dates and review cadence"
        />
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
          <Field label="Owner" error={fe.ownerId}>
            <Select name="ownerId" defaultValue={defaults.ownerId}>
              <option value="">No owner</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department" error={fe.departmentId}>
            <Select name="departmentId" defaultValue={defaults.departmentId}>
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            icon={TriangleAlert}
            tone="danger"
            title="Hazards & risk rating"
            subtitle="Set likelihood and severity — overall risk is calculated automatically"
          />
          <span className="rounded-md bg-surface-2 px-2.5 py-1 font-mono text-xs font-semibold tnum text-muted-foreground">
            {hazards.length} {hazards.length === 1 ? "hazard" : "hazards"}
          </span>
        </div>

        <div className="rounded-[var(--radius-card)] border border-primary/20 bg-accent/40 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-ink">Draft hazards with AI</p>
                <p className="text-xs text-muted-foreground">
                  Claude reviews the selected {subjectLabel.toLowerCase()} and drafts
                  the most important hazards, fully rated. Review and edit each one
                  before saving — it&apos;s a starting point, not a sign-off.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={aiHint}
                  onChange={(e) => setAiHint(e.target.value)}
                  placeholder="Optional focus, e.g. children's lessons, chemical store…"
                  disabled={aiPending}
                  className="sm:flex-1"
                />
                <Button
                  type="button"
                  onClick={onGenerate}
                  disabled={aiPending || !subjectId}
                  className="shrink-0"
                >
                  {aiPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Drafting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Generate hazards
                    </>
                  )}
                </Button>
              </div>
              {!subjectId && (
                <p className="text-xs text-muted-foreground">
                  Pick a {subjectLabel.toLowerCase()} above to enable AI drafting.
                </p>
              )}
            </div>
          </div>
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

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-bg/85 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-b-[var(--radius-card)] sm:px-0">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonClasses({ variant: "ghost" })}>
          Cancel
        </Link>
        <p className="ml-auto hidden text-xs text-muted-foreground sm:block">
          Overall risk is recalculated from each hazard&apos;s likelihood ×
          severity.
        </p>
      </div>
    </form>
  );
}
