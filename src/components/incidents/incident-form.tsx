"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select, Label } from "@/components/ui/form";
import { createIncident, updateIncident } from "@/lib/actions/incidents";
import {
  INCIDENT_SEVERITIES,
  INCIDENT_TYPES,
  INJURED_PARTY_TYPES,
  TREATMENTS,
} from "@/lib/incidents/constants";
import type { FormState } from "@/lib/form";
import type { AreaOption, UserOption } from "@/lib/incidents/types";
import type { CenterSummary } from "@/lib/center-shared";
import { cn } from "@/lib/utils";

type DefaultValues = {
  id?: string;
  centerId: string;
  type: string;
  severity: string;
  occurredAt: string; // yyyy-MM-ddTHH:mm
  areaId: string;
  subAreaId: string;
  description: string;
  immediateAction: string;
  reportedById: string;
};

type WitnessItem = {
  name: string;
  roleOrRelation: string;
  contactPhone: string;
  contactEmail: string;
  statement: string;
  statementDate: string;
};
type InjuredItem = {
  partyType: string;
  name: string;
  contactPhone: string;
  contactEmail: string;
  injuryNature: string;
  bodyPartAffected: string;
  treatment: string;
  hospitalName: string;
  lostTime: boolean;
  lostTimeDays: string;
  additionalNotes: string;
};
type ActionItem = { description: string; assignedTo: string; dueDate: string };

const emptyWitness: WitnessItem = {
  name: "",
  roleOrRelation: "",
  contactPhone: "",
  contactEmail: "",
  statement: "",
  statementDate: "",
};
const emptyInjured: InjuredItem = {
  partyType: "Member",
  name: "",
  contactPhone: "",
  contactEmail: "",
  injuryNature: "",
  bodyPartAffected: "",
  treatment: "FirstAidOnly",
  hospitalName: "",
  lostTime: false,
  lostTimeDays: "",
  additionalNotes: "",
};
const emptyAction: ActionItem = { description: "", assignedTo: "", dueDate: "" };

export function IncidentForm({
  mode,
  centers,
  areaOptions,
  defaultValues,
  isAdmin,
  reporterOptions = [],
}: {
  mode: "create" | "edit";
  centers: CenterSummary[];
  areaOptions: AreaOption[];
  defaultValues: DefaultValues;
  isAdmin: boolean;
  reporterOptions?: UserOption[];
}) {
  const action = mode === "create" ? createIncident : updateIncident;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    null,
  );

  const [centerId, setCenterId] = useState(defaultValues.centerId);
  const [areaId, setAreaId] = useState(defaultValues.areaId);
  const [subAreaId, setSubAreaId] = useState(defaultValues.subAreaId);

  const [witnesses, setWitnesses] = useState<WitnessItem[]>([]);
  const [injured, setInjured] = useState<InjuredItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);

  const fieldErr = (key: string) => state?.fieldErrors?.[key];

  const areasForCenter = useMemo(
    () => areaOptions.filter((a) => a.centerId === centerId),
    [areaOptions, centerId],
  );
  const subAreas = useMemo(
    () => areasForCenter.find((a) => a.id === areaId)?.subAreas ?? [],
    [areasForCenter, areaId],
  );

  // Clean the local repeater state into schema-shaped JSON.
  const witnessesJson = JSON.stringify(witnesses);
  const injuredJson = JSON.stringify(
    injured.map((p) => ({
      ...p,
      lostTimeDays: p.lostTime && p.lostTimeDays ? Number(p.lostTimeDays) : undefined,
    })),
  );
  const actionsJson = JSON.stringify(actions);

  return (
    <form action={formAction} className="space-y-6">
      {defaultValues.id && <input type="hidden" name="id" value={defaultValues.id} />}

      {state && !state.ok && state.error && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius-card)] border border-critical-line bg-critical-bg px-4 py-3 text-sm text-critical">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {/* ── Incident details ── */}
      <Card>
        <CardHeader>
          <CardTitle>Incident details</CardTitle>
        </CardHeader>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Centre" htmlFor="centerId" error={fieldErr("centerId")} required>
            <Select
              id="centerId"
              name="centerId"
              value={centerId}
              onChange={(e) => {
                setCenterId(e.target.value);
                setAreaId("");
                setSubAreaId("");
              }}
            >
              <option value="">Select a centre…</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Occurred at" htmlFor="occurredAt" error={fieldErr("occurredAt")} required>
            <Input
              id="occurredAt"
              name="occurredAt"
              type="datetime-local"
              defaultValue={defaultValues.occurredAt}
            />
          </Field>

          <Field label="Type" htmlFor="type" error={fieldErr("type")} required>
            <Select id="type" name="type" defaultValue={defaultValues.type}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Severity" htmlFor="severity" error={fieldErr("severity")} required>
            <Select id="severity" name="severity" defaultValue={defaultValues.severity}>
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} — {s.label === "Minor" ? "first aid only" : s.label === "Significant" ? "medical treatment" : s.label === "Reportable" ? "external review" : "life-threatening"}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Area" htmlFor="areaId" error={fieldErr("areaId")} required>
            <Select
              id="areaId"
              name="areaId"
              value={areaId}
              onChange={(e) => {
                setAreaId(e.target.value);
                setSubAreaId("");
              }}
              disabled={!centerId}
            >
              <option value="">Select an area…</option>
              {areasForCenter.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Sub-area" htmlFor="subAreaId" hint="Optional — a more precise location">
            <Select
              id="subAreaId"
              name="subAreaId"
              value={subAreaId}
              onChange={(e) => setSubAreaId(e.target.value)}
              disabled={!areaId || subAreas.length === 0}
            >
              <option value="">
                {subAreas.length === 0 ? "No sub-areas" : "None"}
              </option>
              {subAreas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="What happened?"
            htmlFor="description"
            error={fieldErr("description")}
            required
            className="sm:col-span-2"
          >
            <Textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={defaultValues.description}
              placeholder="Describe the incident — what happened, who was involved, and the sequence of events."
            />
          </Field>

          <Field
            label="Immediate action taken"
            htmlFor="immediateAction"
            hint="Optional — what was done at the time"
            className="sm:col-span-2"
          >
            <Textarea
              id="immediateAction"
              name="immediateAction"
              rows={3}
              defaultValue={defaultValues.immediateAction}
            />
          </Field>

          {isAdmin && (
            <Field
              label="Reported by"
              htmlFor="reportedById"
              hint="Defaults to you; admins can attribute the report to another user"
            >
              <Select
                id="reportedById"
                name="reportedById"
                defaultValue={defaultValues.reportedById}
              >
                <option value="">Me</option>
                {reporterOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      {/* ── People & follow-up (create only) ── */}
      {mode === "create" && (
        <>
          <Repeater
            title="Injured parties"
            description="Anyone hurt in the incident."
            addLabel="Add injured party"
            items={injured}
            onAdd={() => setInjured((x) => [...x, { ...emptyInjured }])}
            onRemove={(i) => setInjured((x) => x.filter((_, j) => j !== i))}
            render={(item, i) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Type">
                  <Select
                    value={item.partyType}
                    onChange={(e) => setInjured(upd(i, "partyType", e.target.value))}
                  >
                    {INJURED_PARTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Name">
                  <Input
                    value={item.name}
                    onChange={(e) => setInjured(upd(i, "name", e.target.value))}
                  />
                </Field>
                <Field label="Nature of injury">
                  <Input
                    value={item.injuryNature}
                    onChange={(e) => setInjured(upd(i, "injuryNature", e.target.value))}
                    placeholder="e.g. Laceration"
                  />
                </Field>
                <Field label="Body part affected">
                  <Input
                    value={item.bodyPartAffected}
                    onChange={(e) => setInjured(upd(i, "bodyPartAffected", e.target.value))}
                    placeholder="e.g. Left forearm"
                  />
                </Field>
                <Field label="Treatment given">
                  <Select
                    value={item.treatment}
                    onChange={(e) => setInjured(upd(i, "treatment", e.target.value))}
                  >
                    {TREATMENTS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Hospital (if applicable)">
                  <Input
                    value={item.hospitalName}
                    onChange={(e) => setInjured(upd(i, "hospitalName", e.target.value))}
                  />
                </Field>
                <div className="flex items-center gap-4 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      checked={item.lostTime}
                      onChange={(e) => setInjured(upd(i, "lostTime", e.target.checked))}
                      className="size-4 rounded border-line-strong"
                    />
                    Lost time
                  </label>
                  {item.lostTime && (
                    <Input
                      type="number"
                      min={0}
                      value={item.lostTimeDays}
                      onChange={(e) => setInjured(upd(i, "lostTimeDays", e.target.value))}
                      placeholder="Days"
                      className="h-9 w-28"
                    />
                  )}
                </div>
              </div>
            )}
          />

          <Repeater
            title="Witnesses"
            description="People who saw what happened and their statements."
            addLabel="Add witness"
            items={witnesses}
            onAdd={() => setWitnesses((x) => [...x, { ...emptyWitness }])}
            onRemove={(i) => setWitnesses((x) => x.filter((_, j) => j !== i))}
            render={(item, i) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input
                    value={item.name}
                    onChange={(e) => setWitnesses(upd(i, "name", e.target.value))}
                  />
                </Field>
                <Field label="Role / relationship">
                  <Input
                    value={item.roleOrRelation}
                    onChange={(e) => setWitnesses(upd(i, "roleOrRelation", e.target.value))}
                    placeholder="e.g. Lifeguard"
                  />
                </Field>
                <Field label="Statement date">
                  <Input
                    type="date"
                    value={item.statementDate}
                    onChange={(e) => setWitnesses(upd(i, "statementDate", e.target.value))}
                  />
                </Field>
                <Field label="Contact (phone or email)">
                  <Input
                    value={item.contactPhone}
                    onChange={(e) => setWitnesses(upd(i, "contactPhone", e.target.value))}
                  />
                </Field>
                <Field label="Statement" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={item.statement}
                    onChange={(e) => setWitnesses(upd(i, "statement", e.target.value))}
                  />
                </Field>
              </div>
            )}
          />

          <Repeater
            title="Follow-up actions"
            description="Corrective or preventive actions arising from the incident."
            addLabel="Add action"
            items={actions}
            onAdd={() => setActions((x) => [...x, { ...emptyAction }])}
            onRemove={(i) => setActions((x) => x.filter((_, j) => j !== i))}
            render={(item, i) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Action" className="sm:col-span-2">
                  <Input
                    value={item.description}
                    onChange={(e) => setActions(upd(i, "description", e.target.value))}
                  />
                </Field>
                <Field label="Assigned to">
                  <Input
                    value={item.assignedTo}
                    onChange={(e) => setActions(upd(i, "assignedTo", e.target.value))}
                  />
                </Field>
                <Field label="Due date">
                  <Input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => setActions(upd(i, "dueDate", e.target.value))}
                  />
                </Field>
              </div>
            )}
          />

          <input type="hidden" name="witnesses" value={witnessesJson} />
          <input type="hidden" name="injuredParties" value={injuredJson} />
          <input type="hidden" name="followUpActions" value={actionsJson} />
        </>
      )}

      {/* ── Submit ── */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {mode === "create" ? (
          <>
            <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>
              Save as draft
            </Button>
            <Button type="submit" name="intent" value="submit" disabled={pending}>
              {pending ? "Saving…" : "Submit report"}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        )}
      </div>
    </form>
  );
}

// Curried state updater for the repeater rows.
function upd<T>(index: number, key: keyof T, value: T[keyof T]) {
  return (items: T[]): T[] =>
    items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
}

function Repeater<T>({
  title,
  description,
  addLabel,
  items,
  onAdd,
  onRemove,
  render,
}: {
  title: string;
  description: string;
  addLabel: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  render: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            {title}
            {items.length > 0 && (
              <span className="ml-2 font-normal text-muted-foreground tnum">
                {items.length}
              </span>
            )}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      </CardHeader>
      <div className="space-y-3 p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None added.</p>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className={cn(
                "rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-4",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <Label className="mb-0 text-xs uppercase tracking-wide text-muted-foreground">
                  {title.replace(/s$/, "")} {i + 1}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(i)}
                  className="text-critical hover:bg-critical-bg"
                >
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>
              {render(item, i)}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
