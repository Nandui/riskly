"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import {
  AQUATIC_RESCUE_TYPES,
  EAP_LEVELS,
  SECONDARY_DROWNING_ADVICE,
  YES_NO_UNKNOWN,
} from "@/lib/incidents/constants";
import { moduleFor, typeHasResponseBlock } from "@/lib/incidents/type-modules";

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex h-10 items-center gap-2 text-sm text-ink-soft">
      <input
        type="checkbox"
        name={name}
        value="true"
        className="size-4 rounded border-line-strong"
      />
      {label}
    </label>
  );
}

/**
 * The conditional, per-type capture fields. Only the selected type's module(s)
 * render; the create action reads whatever was posted. Create-mode only.
 */
export function IncidentModuleFields({ type }: { type: string }) {
  const { modules } = moduleFor(type);
  const showResponse = typeHasResponseBlock(type);

  if (modules.length === 0 && !showResponse) return null;

  return (
    <>
      {showResponse && (
        <Card>
          <CardHeader>
            <CardTitle>Emergency response</CardTitle>
          </CardHeader>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <Check name="ambulanceCalled" label="Ambulance called" />
            <Check name="aedUsed" label="AED used" />
            <Check name="cprGiven" label="CPR / resuscitation given" />
          </div>
        </Card>
      )}

      {modules.includes("accident") && (
        <Card>
          <CardHeader>
            <CardTitle>Accident detail</CardTitle>
          </CardHeader>
          <div className="grid gap-4 p-5">
            <Field label="Mechanism" hint="How the injury happened (e.g. slipped on wet tiles).">
              <Textarea name="mechanism" rows={2} />
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
              <Select name="aquaticRescueType" defaultValue="">
                <option value="">Not set</option>
                {AQUATIC_RESCUE_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="EAP level activated">
              <Select name="eapLevel" defaultValue="">
                <option value="">Not set</option>
                {EAP_LEVELS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Lifeguards on duty">
              <Input name="lifeguardsOnDuty" type="number" min={0} max={99} />
            </Field>
            <Field label="Time in difficulty / submerged" hint="Your best estimate (e.g. ~30s).">
              <Input name="timeInDifficulty" placeholder="e.g. ~30 seconds" />
            </Field>
            <Field label="Secondary-drowning advice">
              <Select name="secondaryDrowningAdvice" defaultValue="">
                <option value="">Not set</option>
                {SECONDARY_DROWNING_ADVICE.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Spinal management">
              <Check name="spinalManagement" label="Spinal management applied" />
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
              <Input name="presentingCondition" placeholder="e.g. collapse, seizure, chest pain" />
            </Field>
            <Field label="Conscious">
              <Select name="conscious" defaultValue="">
                <option value="">Not recorded</option>
                {YES_NO_UNKNOWN.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Breathing">
              <Select name="breathing" defaultValue="">
                <option value="">Not recorded</option>
                {YES_NO_UNKNOWN.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Casualty handed over to" hint="Ambulance, GP, family, returned to activity…" className="sm:col-span-2">
              <Input name="casualtyHandover" />
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
              <Input name="freeChlorine" type="number" step="0.01" min={0} />
            </Field>
            <Field label="Combined chlorine (mg/l)">
              <Input name="combinedChlorine" type="number" step="0.01" min={0} />
            </Field>
            <Field label="pH">
              <Input name="ph" type="number" step="0.01" min={0} max={14} />
            </Field>
            <Field label="Corrective dosing">
              <Input name="correctiveDosing" placeholder="e.g. manual dose, backwash" />
            </Field>
            <Field label="Closure start">
              <Input name="closureStart" type="datetime-local" />
            </Field>
            <Field label="Closure end">
              <Input name="closureEnd" type="datetime-local" />
            </Field>
            <Field label="AFR (faecal / vomit release)">
              <Check name="afr" label="Accidental faecal / vomit release" />
            </Field>
            <Field label="Samples">
              <Check name="samplesSent" label="Samples sent for analysis" />
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
              <Input name="crimeReference" />
            </Field>
            <Field label="Garda notification">
              <Check name="gardaiNotified" label="Gardaí notified" />
            </Field>
            <Field label="Ejection">
              <Check name="ejection" label="Person(s) ejected from the centre" />
            </Field>
          </div>
        </Card>
      )}
    </>
  );
}
