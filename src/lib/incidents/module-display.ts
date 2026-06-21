// Turns an incident's populated per-type module columns into labelled groups
// for read-only display. Only non-empty values appear. Client-safe.

import { formatDateTime } from "@/lib/utils";
import {
  ACCIDENT_MECHANISMS,
  AQUATIC_RESCUE_TYPES,
  CHILD_AGE_BANDS,
  EAP_LEVELS,
  FOUND_LOCATION_CLASSES,
  MC_RESPONSE_ACTIONS,
  MISSING_CHILD_RESOLUTIONS,
  MISSING_CHILD_SETTINGS,
  SECONDARY_DROWNING_ADVICE,
  SUPERVISION_CAUSES,
  WATER_PROXIMITY,
  labelFor,
} from "@/lib/incidents/constants";
import type { IncidentDetail } from "@/lib/incidents/types";

// "Time unaccounted" = located − occurred (when found has been recorded).
function durationLabel(occurredAt: Date, locatedAt: Date | null): string | null {
  if (!locatedAt) return null;
  const mins = Math.round((locatedAt.getTime() - occurredAt.getTime()) / 60000);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

type Row = { label: string; value: string };
export type ModuleGroup = { group: string; rows: Row[] };

const yn = (b: boolean | null | undefined): string | null =>
  b == null ? null : b ? "Yes" : "No";
const yesOnly = (b: boolean | null | undefined): string | null =>
  b ? "Yes" : null;
const num = (n: number | null | undefined): string | null =>
  n == null ? null : String(n);
const txt = (s: string | null | undefined): string | null =>
  s && s.trim() ? s : null;

export function incidentModuleGroups(i: IncidentDetail): ModuleGroup[] {
  const groups: ModuleGroup[] = [];
  const row = (label: string, value: string | null): Row | null =>
    value == null ? null : { label, value };
  const push = (group: string, rows: (Row | null)[]) => {
    const r = rows.filter((x): x is Row => x != null);
    if (r.length) groups.push({ group, rows: r });
  };

  push("Regulatory", [
    // Advisory only; show the positive decision, not every "no".
    row("HSA-reportable (advisory)", yesOnly(i.hsaReportable)),
  ]);
  push("Emergency response", [
    row("Ambulance called", yesOnly(i.ambulanceCalled)),
    row("AED used", yesOnly(i.aedUsed)),
    row("CPR / resuscitation", yesOnly(i.cprGiven)),
    row("First aid given by", txt(i.firstAidBy)),
  ]);
  push("Accident", [
    row("Mechanism", i.mechanism ? labelFor(ACCIDENT_MECHANISMS, i.mechanism) : null),
  ]);
  push("Aquatic / water rescue", [
    row("Rescue type", i.aquaticRescueType ? labelFor(AQUATIC_RESCUE_TYPES, i.aquaticRescueType) : null),
    row("EAP level", i.eapLevel ? labelFor(EAP_LEVELS, i.eapLevel) : null),
    row("Lifeguards on duty", num(i.lifeguardsOnDuty)),
    row("Time in difficulty", txt(i.timeInDifficulty)),
    row("Spinal management", yesOnly(i.spinalManagement)),
    row("Secondary-drowning advice", i.secondaryDrowningAdvice ? labelFor(SECONDARY_DROWNING_ADVICE, i.secondaryDrowningAdvice) : null),
  ]);
  push("Medical", [
    row("Presenting condition", txt(i.presentingCondition)),
    row("Conscious", txt(i.conscious)),
    row("Breathing", txt(i.breathing)),
    row("Handed over to", txt(i.casualtyHandover)),
  ]);
  push("Facility / water quality", [
    row("AFR (faecal / vomit release)", yesOnly(i.afr)),
    row("Free chlorine (mg/l)", num(i.freeChlorine)),
    row("Combined chlorine (mg/l)", num(i.combinedChlorine)),
    row("pH", num(i.ph)),
    row("Corrective dosing", txt(i.correctiveDosing)),
    row("Closure start", i.closureStart ? formatDateTime(i.closureStart) : null),
    row("Closure end", i.closureEnd ? formatDateTime(i.closureEnd) : null),
    row("Samples sent", yesOnly(i.samplesSent)),
  ]);
  push("Security / antisocial", [
    row("Crime / Garda reference", txt(i.crimeReference)),
    row("Gardaí notified", yesOnly(i.gardaiNotified)),
    row("Ejection", yesOnly(i.ejection)),
  ]);
  push("Missing child (Code Amber)", [
    row("Setting", i.missingChildSetting ? labelFor(MISSING_CHILD_SETTINGS, i.missingChildSetting) : null),
    row("Child age band", i.childAgeBand ? labelFor(CHILD_AGE_BANDS, i.childAgeBand) : null),
    row("Time unaccounted", durationLabel(i.occurredAt, i.locatedAt)),
    row("Last seen", txt(i.lastSeenLocation)),
    row("Found — location", i.foundLocationClass ? labelFor(FOUND_LOCATION_CLASSES, i.foundLocationClass) : null),
    row("Proximity to water", i.proximityToWaterWhenFound ? labelFor(WATER_PROXIMITY, i.proximityToWaterWhenFound) : null),
    row("Water search initiated", yesOnly(i.waterSearchInitiated)),
    row("Pools cleared", txt(i.poolsCleared)),
    row("Response actions", i.responseActions ? i.responseActions.split(",").map((v) => labelFor(MC_RESPONSE_ACTIONS, v)).join(", ") : null),
    row("Site lockdown", yesOnly(i.lockdownInitiated)),
    row("Emergency services called", yesOnly(i.emergencyServicesCalled)),
    row("Resolution", i.missingChildResolution ? labelFor(MISSING_CHILD_RESOLUTIONS, i.missingChildResolution) : null),
    row("Supervision cause", i.supervisionCause ? labelFor(SUPERVISION_CAUSES, i.supervisionCause) : null),
    row("Policy reinforced", yesOnly(i.policyReinforced)),
  ]);

  return groups;
}
