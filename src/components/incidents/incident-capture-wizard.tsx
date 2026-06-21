"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Plus, Trash2, TriangleAlert, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select, Label } from "@/components/ui/form";
import { createIncident } from "@/lib/actions/incidents";
import {
  HARM_OUTCOMES,
  INCIDENT_TYPES,
  INCIDENT_TYPE_META,
  INJURED_PARTY_TYPES,
  severityFromOutcome,
} from "@/lib/incidents/constants";
import { moduleFor } from "@/lib/incidents/type-modules";
import { IncidentModuleFields } from "@/components/incidents/incident-module-fields";
import { IncidentPhotoInput } from "@/components/incidents/incident-photo-input";
import type { FormState } from "@/lib/form";
import type { AreaOption, UserOption } from "@/lib/incidents/types";
import type { CenterSummary } from "@/lib/center-shared";
import { cn } from "@/lib/utils";

type WitnessItem = {
  name: string;
  roleOrRelation: string;
  contactPhone: string;
};
type InjuredItem = {
  partyType: string;
  name: string;
  memberId: string;
  contactPhone: string;
  injuryNature: string;
  bodyPartAffected: string;
};

const emptyWitness: WitnessItem = { name: "", roleOrRelation: "", contactPhone: "" };
const emptyInjured: InjuredItem = { partyType: "Member", name: "", memberId: "", contactPhone: "", injuryNature: "", bodyPartAffected: "" };

const STEPS = ["Type", "Where & when", "What happened", "Who was affected", "Review"];

export function IncidentCaptureWizard({
  centers,
  areaOptions,
  defaultValues,
  isAdmin,
  reporterOptions = [],
}: {
  centers: CenterSummary[];
  areaOptions: AreaOption[];
  defaultValues: { centerId: string; occurredAt: string; reportedById: string };
  isAdmin: boolean;
  reporterOptions?: UserOption[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createIncident, null);

  const [step, setStep] = useState(0);
  const [type, setType] = useState("");
  const [centerId, setCenterId] = useState(defaultValues.centerId);
  const [areaId, setAreaId] = useState("");
  const [occurredAt, setOccurredAt] = useState(defaultValues.occurredAt);
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
  const [injured, setInjured] = useState<InjuredItem[]>([]);
  const [witnesses, setWitnesses] = useState<WitnessItem[]>([]);
  const [imported, setImported] = useState(false); // admin: historical record

  const tm = moduleFor(type);
  const areasForCenter = useMemo(() => areaOptions.filter((a) => a.centerId === centerId), [areaOptions, centerId]);

  const severity = severityFromOutcome(outcome);
  const witnessesJson = JSON.stringify(witnesses.map((w) => ({ ...w, contactEmail: "" })));
  // Treatment isn't asked at capture — it's implied by the harm-outcome tap (a
  // manager refines it per-person during investigation).
  const derivedTreatment =
    outcome === "FirstAid" ? "FirstAidOnly" : outcome === "Doctor" ? "GpReferral" : outcome === "Serious" ? "HospitalAE" : "None";
  const injuredJson = JSON.stringify(injured.map((p) => ({ ...p, treatment: derivedTreatment })));

  // Per-step "can advance" gates (the essentials). occurredAt has a default.
  const stepReady = [
    !!type,
    !!centerId && !!areaId && !!occurredAt,
    description.trim().length >= 10,
    !!outcome,
    true,
  ];
  const draftReady = !!type && !!centerId && !!areaId;
  const isLast = step === STEPS.length - 1;

  function next() {
    if (stepReady[step]) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goTo(i: number) {
    // allow jumping back, or forward only as far as prior steps are satisfied
    if (i <= step || stepReady.slice(0, i).every(Boolean)) setStep(i);
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Derived / repeater values posted as hidden inputs (mounted always). */}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="severity" value={severity} />
      <input type="hidden" name="witnesses" value={witnessesJson} />
      <input type="hidden" name="injuredParties" value={injuredJson} />

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors",
                  active ? "bg-primary/10 text-primary font-medium" : done ? "text-ink hover:bg-surface-2" : "text-muted-foreground",
                )}
              >
                <span className={cn("flex size-5 items-center justify-center rounded-full text-xs tnum", active ? "bg-primary text-white" : done ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted-foreground")}>
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="size-3.5 text-faint" />}
            </li>
          );
        })}
      </ol>

      {state && !state.ok && state.error && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-card)] border border-critical-line bg-critical-bg px-4 py-3 text-sm text-critical">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {/* ── Step 1: Type ───────────────────────────────────────────────── */}
      <div className={cn(step !== 0 && "hidden")}>
        <Card>
          <CardHeader><CardTitle>What kind of incident?</CardTitle></CardHeader>
          <div className="grid gap-2.5 p-5 sm:grid-cols-2">
            {INCIDENT_TYPES.map((t) => {
              const selected = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex min-h-[60px] flex-col items-start gap-0.5 rounded-[var(--radius-card)] border p-3 text-left transition-colors",
                    selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="text-sm font-medium text-ink">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{moduleFor(t.value).examples}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Step 2: Where & when ───────────────────────────────────────── */}
      <div className={cn(step !== 1 && "hidden")}>
        <Card>
          <CardHeader><CardTitle>Where &amp; when</CardTitle></CardHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Centre" required>
              <Select value={centerId} name="centerId" onChange={(e) => { setCenterId(e.target.value); setAreaId(""); }}>
                <option value="">Select a centre…</option>
                {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Occurred at" required>
              <Input type="datetime-local" name="occurredAt" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </Field>
            <Field
              label={type === "MissingChild" ? "Last seen (area)" : "Area"}
              hint={type === "MissingChild" ? "Where the child was last accounted for." : undefined}
              required
            >
              <Select value={areaId} name="areaId" onChange={(e) => setAreaId(e.target.value)} disabled={!centerId}>
                <option value="">Select an area…</option>
                {areasForCenter.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          </div>
        </Card>
      </div>

      {/* ── Step 3: What happened ──────────────────────────────────────── */}
      <div className={cn("space-y-6", step !== 2 && "hidden")}>
        <Card>
          <CardHeader><CardTitle>What happened</CardTitle></CardHeader>
          <div className="grid gap-4 p-5">
            <Field label="In a few factual lines" htmlFor="description" hint={tm.narrativeHint} required>
              <Textarea
                id="description"
                name="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tm.narrativePlaceholder ?? "Describe what happened and the sequence of events."}
              />
            </Field>
            {!tm.hideImmediateAction && (
              <Field label="Immediate action taken" hint="Optional — what was done at the time">
                <Textarea name="immediateAction" rows={2} />
              </Field>
            )}
            <Field label="Photo" hint="Optional — a quick photo of the scene or hazard.">
              <IncidentPhotoInput />
            </Field>
          </div>
        </Card>

        {/* Type-specific module fields (optional detail). */}
        <IncidentModuleFields type={type} areas={areasForCenter} />
      </div>

      {/* ── Step 4: Who was affected ───────────────────────────────────── */}
      <div className={cn("space-y-6", step !== 3 && "hidden")}>
        <Card>
          <CardHeader><CardTitle>Was anyone hurt?</CardTitle></CardHeader>
          <div className="grid gap-2.5 p-5 sm:grid-cols-2">
            {HARM_OUTCOMES.map((o) => {
              const selected = outcome === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={cn(
                    "flex min-h-[56px] flex-col items-start gap-0.5 rounded-[var(--radius-card)] border p-3 text-left transition-colors",
                    selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="text-sm font-medium text-ink">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.sub}</span>
                </button>
              );
            })}
          </div>
          <p className="px-5 pb-4 text-xs text-muted-foreground">A manager can confirm the outcome during the investigation.</p>
        </Card>

        {outcome !== "" && outcome !== "None" && (
          <Repeater
            title="Injured people"
            description="Optional — record who was hurt and the injury. Treatment, hospital and lost-time are added during the investigation."
            addLabel="Add injured person"
            items={injured}
            onAdd={() => setInjured((x) => [...x, { ...emptyInjured }])}
            onRemove={(i) => setInjured((x) => x.filter((_, j) => j !== i))}
            itemNoun="Injured person"
            render={(item, i) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Type"><Select value={item.partyType} onChange={(e) => setInjured(upd(i, "partyType", e.target.value))}>{INJURED_PARTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
                <Field label="Name"><Input value={item.name} onChange={(e) => setInjured(upd(i, "name", e.target.value))} /></Field>
                {item.partyType === "Member" && (
                  <Field label="Member ID"><Input value={item.memberId} onChange={(e) => setInjured(upd(i, "memberId", e.target.value))} placeholder="e.g. LWB26571" /></Field>
                )}
                <Field label="Contact (person or next of kin)"><Input value={item.contactPhone} onChange={(e) => setInjured(upd(i, "contactPhone", e.target.value))} placeholder="Phone number" /></Field>
                <Field label="Nature of injury" hint="The injury itself (e.g. laceration, sprain) — not how it happened."><Input value={item.injuryNature} onChange={(e) => setInjured(upd(i, "injuryNature", e.target.value))} placeholder="e.g. Laceration" /></Field>
                <Field label="Body part affected"><Input value={item.bodyPartAffected} onChange={(e) => setInjured(upd(i, "bodyPartAffected", e.target.value))} placeholder="e.g. Left forearm" /></Field>
              </div>
            )}
          />
        )}

        <Repeater
          title="Witnesses"
          description="Optional — names now; full statements can be taken during the investigation."
          addLabel="Add witness"
          items={witnesses}
          onAdd={() => setWitnesses((x) => [...x, { ...emptyWitness }])}
          onRemove={(i) => setWitnesses((x) => x.filter((_, j) => j !== i))}
          itemNoun="Witness"
          render={(item, i) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><Input value={item.name} onChange={(e) => setWitnesses(upd(i, "name", e.target.value))} /></Field>
              <Field label="Role / relationship"><Input value={item.roleOrRelation} onChange={(e) => setWitnesses(upd(i, "roleOrRelation", e.target.value))} placeholder="e.g. Lifeguard" /></Field>
              <Field label="Contact (phone or email)" className="sm:col-span-2"><Input value={item.contactPhone} onChange={(e) => setWitnesses(upd(i, "contactPhone", e.target.value))} /></Field>
            </div>
          )}
        />
      </div>

      {/* ── Step 5: Review ─────────────────────────────────────────────── */}
      <div className={cn(step !== 4 && "hidden")}>
        <Card>
          <CardHeader><CardTitle>Review &amp; submit</CardTitle></CardHeader>
          <div className="space-y-3 p-5">
            <ReviewRow label="Type" value={INCIDENT_TYPE_META[type]?.label ?? "—"} />
            <ReviewRow label="Centre / area" value={[centers.find((c) => c.id === centerId)?.name, areasForCenter.find((a) => a.id === areaId)?.name].filter(Boolean).join(" · ") || "—"} />
            <ReviewRow label="Occurred" value={occurredAt ? occurredAt.replace("T", " ") : "—"} />
            <ReviewRow label="Outcome" value={HARM_OUTCOMES.find((o) => o.value === outcome)?.label ?? "Not set"} />
            <ReviewRow label="People" value={`${injured.length} injured · ${witnesses.length} witness${witnesses.length === 1 ? "" : "es"}`} />
            {isAdmin && (
              <Field label="Reported by" hint="Defaults to you; admins can attribute to another user">
                <Select name="reportedById" defaultValue={defaultValues.reportedById}>
                  {reporterOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
            )}
            {isAdmin && (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={imported}
                  onChange={(e) => setImported(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-line-strong"
                />
                <span>
                  <span className="font-medium text-ink">Import as a historical record</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    For entering old incidents from a previous system. Stays out of the open / overdue counts (it still feeds the trend charts).
                  </span>
                </span>
              </label>
            )}
            <input type="hidden" name="imported" value={imported ? "true" : ""} />
            <p className="text-xs text-muted-foreground">
              {imported
                ? "This will be saved as an imported historical record."
                : "On submit this becomes an open incident."}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Footer nav ─────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-line bg-surface/80 py-3 backdrop-blur">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0 || pending}>
          <ChevronLeft className="size-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending || !draftReady}>
            Save as draft
          </Button>
          {/* Next and Submit are separate, always-rendered elements (one hidden)
              so a click on Next never lands on a button whose type changed to
              "submit" mid-click — which would otherwise submit the form early. */}
          <Button
            type="button"
            onClick={next}
            disabled={!stepReady[step]}
            className={cn(isLast && "hidden")}
          >
            Next <ChevronRight className="size-4" />
          </Button>
          <Button
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
            className={cn(!isLast && "hidden")}
          >
            {pending ? "Saving…" : imported ? "Import record" : "Submit report"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

function upd<T>(index: number, key: keyof T, value: T[keyof T]) {
  return (items: T[]): T[] => items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
}

function Repeater<T>({ title, description, addLabel, items, onAdd, onRemove, render, itemNoun }: {
  title: string; description: string; addLabel: string; items: T[]; onAdd: () => void; onRemove: (i: number) => void; render: (item: T, i: number) => React.ReactNode; itemNoun?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}{items.length > 0 && <span className="ml-2 font-normal text-muted-foreground tnum">{items.length}</span>}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}><Plus className="size-4" /> {addLabel}</Button>
      </CardHeader>
      <div className="space-y-3 p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None added.</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label className="mb-0 text-xs uppercase tracking-wide text-muted-foreground">{itemNoun ?? title.replace(/s$/, "")} {i + 1}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(i)} className="text-critical hover:bg-critical-bg"><Trash2 className="size-4" /> Remove</Button>
              </div>
              {render(item, i)}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
