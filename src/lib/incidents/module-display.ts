// Turns an incident's populated per-type module columns into labelled groups
// for read-only display. Only non-empty values appear. Client-safe.

import { formatDateTime } from "@/lib/utils";
import {
  AQUATIC_RESCUE_TYPES,
  EAP_LEVELS,
  SECONDARY_DROWNING_ADVICE,
  labelFor,
} from "@/lib/incidents/constants";
import type { IncidentDetail } from "@/lib/incidents/types";

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
  ]);
  push("Accident", [row("Mechanism", txt(i.mechanism))]);
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

  return groups;
}
