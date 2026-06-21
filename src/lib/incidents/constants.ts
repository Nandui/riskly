// Incidents module — domain enums + display metadata. Client-safe (no server
// imports), so both server code and client components can use it.
//
// Values are PascalCase strings stored in String columns, matching the rest of
// the Riskly schema (e.g. assessment status). The risk palette
// (green→amber→orange→red) stays reserved for SEVERITY (it is semantic, a direct
// analogue of risk bands); every other dimension uses cool/neutral hues so the
// risk palette keeps its exclusive meaning.

// ─── Incident type ──────────────────────────────────────────────────────────

export const INCIDENT_TYPES = [
  { value: "Accident", label: "Accident" },
  { value: "NearMiss", label: "Near miss" },
  { value: "PropertyDamage", label: "Property damage" },
  { value: "ViolenceAggression", label: "Violence / aggression" },
  { value: "HazardousSubstance", label: "Hazardous substance" },
  { value: "FireOrEvacuation", label: "Fire / evacuation" },
  { value: "Other", label: "Other" },
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number]["value"];

export const INCIDENT_TYPE_META: Record<string, { label: string; pill: string }> = {
  Accident: { label: "Accident", pill: "bg-slate-100 text-slate-700 border border-slate-200" },
  NearMiss: { label: "Near miss", pill: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  PropertyDamage: { label: "Property damage", pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  ViolenceAggression: { label: "Violence / aggression", pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  HazardousSubstance: { label: "Hazardous substance", pill: "bg-teal-50 text-teal-700 border border-teal-200" },
  FireOrEvacuation: { label: "Fire / evacuation", pill: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  Other: { label: "Other", pill: "bg-slate-50 text-slate-500 border border-slate-200" },
};

// ─── Incident status (lifecycle) ────────────────────────────────────────────

export const INCIDENT_STATUSES = [
  { value: "Draft", label: "Draft" },
  { value: "Open", label: "Open" },
  { value: "UnderInvestigation", label: "Under investigation" },
  { value: "Closed", label: "Closed" },
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]["value"];

export const INCIDENT_STATUS_META: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  Draft: {
    label: "Draft",
    pill: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
  Open: {
    label: "Open",
    pill: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  UnderInvestigation: {
    label: "Under investigation",
    pill: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    dot: "bg-indigo-500",
  },
  Closed: {
    label: "Closed",
    pill: "bg-slate-50 text-slate-400 border border-slate-200",
    dot: "bg-slate-300",
  },
};

// ─── Incident severity (reuses the risk palette — semantic) ─────────────────

export const INCIDENT_SEVERITIES = [
  { value: "Minor", label: "Minor" },
  { value: "Significant", label: "Significant" },
  { value: "Reportable", label: "Reportable" },
  { value: "Critical", label: "Critical" },
] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]["value"];

// Rank for sorting (high → low). Mirrors the risk bands' increasing severity.
export const SEVERITY_RANK: Record<string, number> = {
  Minor: 0,
  Significant: 1,
  Reportable: 2,
  Critical: 3,
};

export const INCIDENT_SEVERITY_META: Record<
  string,
  { label: string; description: string; pill: string; dot: string; solid: string }
> = {
  Minor: {
    label: "Minor",
    description: "First aid only, no lost time",
    pill: "bg-low-bg text-low border border-low-line",
    dot: "bg-low",
    solid: "bg-low text-white",
  },
  Significant: {
    label: "Significant",
    description: "Medical treatment, potential lost time",
    pill: "bg-medium-bg text-medium border border-medium-line",
    dot: "bg-medium",
    solid: "bg-medium text-white",
  },
  Reportable: {
    label: "Reportable",
    description: "Serious enough to warrant external / management review",
    pill: "bg-high-bg text-high border border-high-line",
    dot: "bg-high",
    solid: "bg-high text-white",
  },
  Critical: {
    label: "Critical",
    description: "Fatality or life-threatening",
    pill: "bg-critical-bg text-critical border border-critical-line",
    dot: "bg-critical",
    solid: "bg-critical text-white",
  },
};

// ─── Injured party type ─────────────────────────────────────────────────────

export const INJURED_PARTY_TYPES = [
  { value: "Staff", label: "Staff" },
  { value: "Member", label: "Member" },
  { value: "Contractor", label: "Contractor" },
  { value: "Visitor", label: "Visitor" },
  { value: "Public", label: "Member of the public" },
] as const;

export type InjuredPartyType = (typeof INJURED_PARTY_TYPES)[number]["value"];

export const INJURED_PARTY_TYPE_LABELS: Record<string, string> =
  Object.fromEntries(INJURED_PARTY_TYPES.map((t) => [t.value, t.label]));

// ─── Treatment given ────────────────────────────────────────────────────────

export const TREATMENTS = [
  { value: "None", label: "None" },
  { value: "FirstAidOnly", label: "First aid only" },
  { value: "GpReferral", label: "GP referral" },
  { value: "HospitalAE", label: "Hospital A&E" },
  { value: "HospitalAdmitted", label: "Hospital — admitted" },
] as const;

export type TreatmentGiven = (typeof TREATMENTS)[number]["value"];

export const TREATMENT_LABELS: Record<string, string> = Object.fromEntries(
  TREATMENTS.map((t) => [t.value, t.label]),
);

// ─── Follow-up action status ────────────────────────────────────────────────

export const ACTION_STATUSES = [
  { value: "Open", label: "Open" },
  { value: "InProgress", label: "In progress" },
  { value: "Complete", label: "Complete" },
  { value: "Overdue", label: "Overdue" },
] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number]["value"];

export const ACTION_STATUS_META: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  Open: {
    label: "Open",
    pill: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  InProgress: {
    label: "In progress",
    pill: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    dot: "bg-indigo-500",
  },
  Complete: {
    label: "Complete",
    pill: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
  // Overdue borrows the critical (red) treatment Riskly already uses for overdue
  // reviews — genuine urgency, not decoration.
  Overdue: {
    label: "Overdue",
    pill: "bg-critical-bg text-critical border border-critical-line",
    dot: "bg-critical",
  },
};

// Statuses that count as "not yet done" for an action (open work).
export const OPEN_ACTION_STATUSES = ["Open", "InProgress", "Overdue"] as const;

// Statuses where an incident is live (counts on the dashboard active list).
export const ACTIVE_INCIDENT_STATUSES = ["Open", "UnderInvestigation"] as const;

// Generic helpers --------------------------------------------------------------

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
