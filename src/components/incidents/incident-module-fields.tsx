"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import {
  ACCIDENT_MECHANISMS,
  AQUATIC_RESCUE_TYPES,
  CHILD_AGE_BANDS,
  EAP_LEVELS,
  MC_RESPONSE_ACTIONS,
  MISSING_CHILD_RESOLUTIONS,
  SECONDARY_DROWNING_ADVICE,
  WATER_PROXIMITY,
  YES_NO_UNKNOWN,
} from "@/lib/incidents/constants";
import { moduleFor, typeHasResponseBlock } from "@/lib/incidents/type-modules";

// The captured per-type fields, as stored on the incident. Optional everywhere
// so the same component serves capture (no defaults) and edit (prefilled).
export type ModuleDefaults = {
  ambulanceCalled?: boolean | null;
  aedUsed?: boolean | null;
  cprGiven?: boolean | null;
  firstAidBy?: string | null;
  mechanism?: string | null;
  aquaticRescueType?: string | null;
  eapLevel?: string | null;
  lifeguardsOnDuty?: number | null;
  timeInDifficulty?: string | null;
  spinalManagement?: boolean | null;
  secondaryDrowningAdvice?: string | null;
  presentingCondition?: string | null;
  conscious?: string | null;
  breathing?: string | null;
  casualtyHandover?: string | null;
  afr?: boolean | null;
  freeChlorine?: number | null;
  combinedChlorine?: number | null;
  ph?: number | null;
  correctiveDosing?: string | null;
  closureStart?: Date | null;
  closureEnd?: Date | null;
  samplesSent?: boolean | null;
  crimeReference?: string | null;
  gardaiNotified?: boolean | null;
  ejection?: boolean | null;
  timeToLocateMins?: number | null;
  childAgeBand?: string | null;
  foundLocationClass?: string | null;
  proximityToWaterWhenFound?: string | null;
  missingChildResolution?: string | null;
  poolsCleared?: string | null;
  responseActions?: string | null;
  waterSearchInitiated?: boolean | null;
  lockdownInitiated?: boolean | null;
  emergencyServicesCalled?: boolean | null;
};

function Check({
  name,
  label,
  value = "true",
  defaultChecked,
}: {
  name: string;
  label: string;
  value?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex h-10 items-center gap-2 text-sm text-ink-soft">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-line-strong"
      />
      {label}
    </label>
  );
}

// datetime-local value from a Date, or "" — local time, no timezone suffix.
function dtLocal(d: Date | null | undefined): string {
  return d ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}
const str = (v: string | null | undefined) => v ?? "";
const numStr = (v: number | null | undefined) => (v == null ? "" : String(v));

/**
 * The conditional, per-type capture fields. Only the selected type's module(s)
 * render. Used both at capture (defaults undefined → blank) and when editing the
 * type-specific detail later (defaults prefilled from the incident).
 */
export function IncidentModuleFields({
  type,
  areas = [],
  defaults,
}: {
  type: string;
  areas?: { id: string; name: string }[];
  defaults?: ModuleDefaults;
}) {
  const { modules } = moduleFor(type);
  const showResponse = typeHasResponseBlock(type);
  // Missing-child: a child handed to the Gardaí was never found by us, so the
  // "time to find" doesn't apply.
  const [mcResolution, setMcResolution] = useState(
    defaults?.missingChildResolution ?? "",
  );
  const notFound = mcResolution === "PoliceHandover";

  // Which response actions are already ticked (comma-serialised multi-select).
  const responseSet = new Set(
    (defaults?.responseActions ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  if (modules.length === 0 && !showResponse) return null;

  return (
    <>
      {showResponse && (
        <Card>
          <CardHeader>
            <CardTitle>Emergency response</CardTitle>
          </CardHeader>
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Check name="ambulanceCalled" label="Ambulance called" defaultChecked={!!defaults?.ambulanceCalled} />
              <Check name="aedUsed" label="AED used" defaultChecked={!!defaults?.aedUsed} />
              <Check name="cprGiven" label="CPR / resuscitation given" defaultChecked={!!defaults?.cprGiven} />
            </div>
            <Field label="First aid given by" hint="Optional — name or role of who administered first aid.">
              <Input name="firstAidBy" defaultValue={str(defaults?.firstAidBy)} />
            </Field>
          </div>
        </Card>
      )}

      {modules.includes("accident") && (
        <Card>
          <CardHeader>
            <CardTitle>Accident detail</CardTitle>
          </CardHeader>
          <div className="grid gap-4 p-5">
            <Field label="Mechanism" hint="The kind of accident — what physically caused the injury. The detail goes in “What happened?”.">
              <Select name="mechanism" defaultValue={str(defaults?.mechanism)}>
                <option value="">Not set</option>
                {ACCIDENT_MECHANISMS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      )}

      {modules.includes("aquatic") && (
        <Card>
          <CardHeader>
            <CardTitle>Aquatic / water-rescue detail</CardTitle>
          </CardHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Rescue type">
              <Select name="aquaticRescueType" defaultValue={str(defaults?.aquaticRescueType)}>
                <option value="">Not set</option>
                {AQUATIC_RESCUE_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="EAP level activated">
              <Select name="eapLevel" defaultValue={str(defaults?.eapLevel)}>
                <option value="">Not set</option>
                {EAP_LEVELS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Lifeguards on duty">
              <Input name="lifeguardsOnDuty" type="number" min={0} max={99} defaultValue={numStr(defaults?.lifeguardsOnDuty)} />
            </Field>
            <Field label="Time in difficulty / submerged" hint="Your best estimate (e.g. ~30s).">
              <Input name="timeInDifficulty" placeholder="e.g. ~30 seconds" defaultValue={str(defaults?.timeInDifficulty)} />
            </Field>
            <Field label="Secondary-drowning advice">
              <Select name="secondaryDrowningAdvice" defaultValue={str(defaults?.secondaryDrowningAdvice)}>
                <option value="">Not set</option>
                {SECONDARY_DROWNING_ADVICE.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Spinal management">
              <Check name="spinalManagement" label="Spinal management applied" defaultChecked={!!defaults?.spinalManagement} />
            </Field>
          </div>
        </Card>
      )}

      {modules.includes("medical") && (
        <Card>
          <CardHeader>
            <CardTitle>Medical detail</CardTitle>
          </CardHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Presenting condition" hint="What the casualty presented with." className="sm:col-span-2">
              <Input name="presentingCondition" placeholder="e.g. collapse, seizure, chest pain" defaultValue={str(defaults?.presentingCondition)} />
            </Field>
            <Field label="Conscious">
              <Select name="conscious" defaultValue={str(defaults?.conscious)}>
                <option value="">Not recorded</option>
                {YES_NO_UNKNOWN.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Breathing">
              <Select name="breathing" defaultValue={str(defaults?.breathing)}>
                <option value="">Not recorded</option>
                {YES_NO_UNKNOWN.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Casualty handed over to" hint="Ambulance, GP, family, returned to activity…" className="sm:col-span-2">
              <Input name="casualtyHandover" defaultValue={str(defaults?.casualtyHandover)} />
            </Field>
          </div>
        </Card>
      )}

      {modules.includes("facility") && (
        <Card>
          <CardHeader>
            <CardTitle>Facility / water-quality detail</CardTitle>
          </CardHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Free chlorine (mg/l)">
              <Input name="freeChlorine" type="number" step="0.01" min={0} defaultValue={numStr(defaults?.freeChlorine)} />
            </Field>
            <Field label="Combined chlorine (mg/l)">
              <Input name="combinedChlorine" type="number" step="0.01" min={0} defaultValue={numStr(defaults?.combinedChlorine)} />
            </Field>
            <Field label="pH">
              <Input name="ph" type="number" step="0.01" min={0} max={14} defaultValue={numStr(defaults?.ph)} />
            </Field>
            <Field label="Corrective dosing">
              <Input name="correctiveDosing" placeholder="e.g. manual dose, backwash" defaultValue={str(defaults?.correctiveDosing)} />
            </Field>
            <Field label="Closure start">
              <Input name="closureStart" type="datetime-local" defaultValue={dtLocal(defaults?.closureStart)} />
            </Field>
            <Field label="Closure end">
              <Input name="closureEnd" type="datetime-local" defaultValue={dtLocal(defaults?.closureEnd)} />
            </Field>
            <Field label="AFR (faecal / vomit release)">
              <Check name="afr" label="Accidental faecal / vomit release" defaultChecked={!!defaults?.afr} />
            </Field>
            <Field label="Samples">
              <Check name="samplesSent" label="Samples sent for analysis" defaultChecked={!!defaults?.samplesSent} />
            </Field>
          </div>
        </Card>
      )}

      {modules.includes("security") && (
        <Card>
          <CardHeader>
            <CardTitle>Security / antisocial detail</CardTitle>
          </CardHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Crime / Garda reference" hint="If reported to the Gardaí.">
              <Input name="crimeReference" defaultValue={str(defaults?.crimeReference)} />
            </Field>
            <Field label="Garda notification">
              <Check name="gardaiNotified" label="Gardaí notified" defaultChecked={!!defaults?.gardaiNotified} />
            </Field>
            <Field label="Ejection">
              <Check name="ejection" label="Person(s) ejected from the centre" defaultChecked={!!defaults?.ejection} />
            </Field>
          </div>
        </Card>
      )}

      {modules.includes("missingChild") && (
        <Card>
          <CardHeader>
            <CardTitle>Missing child (Code Amber) detail</CardTitle>
          </CardHeader>
          <div className="px-5 pt-4">
            <p className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              <strong>Operational facts only.</strong> Do not record the child&apos;s
              name, the guardian&apos;s conduct, or any welfare concern here — raise
              those with the Designated Liaison Person (DLP) through the
              safeguarding process.
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Child age band" hint="Band only — never a name or date of birth.">
              <Select name="childAgeBand" defaultValue={str(defaults?.childAgeBand)}>
                <option value="">Not set</option>
                {CHILD_AGE_BANDS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </Select>
            </Field>
            {!notFound && (
              <Field label="Time to locate (minutes)" hint="Roughly how long it took to find the child.">
                <Input name="timeToLocateMins" type="number" min={0} max={1440} placeholder="e.g. 8" defaultValue={numStr(defaults?.timeToLocateMins)} />
              </Field>
            )}
            <Field label="Found (area)" hint="Where the child was located. Found in or under the water? Log it as an Aquatic rescue instead.">
              <Select name="foundLocationClass" defaultValue={str(defaults?.foundLocationClass)}>
                <option value="">{areas.length ? "Not set" : "No areas"}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Proximity to water when found">
              <Select name="proximityToWaterWhenFound" defaultValue={str(defaults?.proximityToWaterWhenFound)}>
                <option value="">Not set</option>
                {WATER_PROXIMITY.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Resolution">
              <Select
                name="missingChildResolution"
                value={mcResolution}
                onChange={(e) => setMcResolution(e.target.value)}
              >
                <option value="">Not set</option>
                {MISSING_CHILD_RESOLUTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Pools cleared" hint="Which water bodies were physically searched (facts only).">
              <Input name="poolsCleared" placeholder="e.g. main pool, learner pool" defaultValue={str(defaults?.poolsCleared)} />
            </Field>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-ink">Response actions taken</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {MC_RESPONSE_ACTIONS.map((r) => (
                  <Check key={r.value} name="responseActions" label={r.label} value={r.value} defaultChecked={responseSet.has(r.value)} />
                ))}
                <Check name="waterSearchInitiated" label="Water treated as a live search zone" defaultChecked={!!defaults?.waterSearchInitiated} />
                <Check name="lockdownInitiated" label="Site lockdown / EAP initiated" defaultChecked={!!defaults?.lockdownInitiated} />
                <Check name="emergencyServicesCalled" label="Gardaí / emergency services called" defaultChecked={!!defaults?.emergencyServicesCalled} />
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
