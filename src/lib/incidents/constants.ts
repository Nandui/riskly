// Incidents module — domain enums + display metadata. Client-safe (no server
// imports), so both server code and client components can use it.
//
// Values are PascalCase strings stored in String columns, matching the rest of
// the Riskly schema (e.g. assessment status). The risk palette
// (green→amber→orange→red) stays reserved for SEVERITY (it is semantic, a direct
// analogue of risk bands); every other dimension uses cool/neutral hues so the
// risk palette keeps its exclusive meaning.

// ─── Incident type ──────────────────────────────────────────────────────────

// The leisure-centre event taxonomy. Each type is its own stream so the data
// can be searched and trended by class. Selectable for new reports.
export const INCIDENT_TYPES = [
  { value: "Accident", label: "Accident" },
  { value: "NearMiss", label: "Near miss" },
  { value: "DangerousOccurrence", label: "Dangerous occurrence" },
  { value: "Aquatic", label: "Aquatic / water rescue" },
  { value: "Medical", label: "Medical / first aid" },
  { value: "Security", label: "Security / antisocial" },
  { value: "Facility", label: "Facility / environmental" },
  { value: "Other", label: "Other" },
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number]["value"];

export const INCIDENT_TYPE_META: Record<string, { label: string; pill: string }> = {
  Accident: { label: "Accident", pill: "bg-slate-100 text-slate-700 border border-slate-200" },
  NearMiss: { label: "Near miss", pill: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  DangerousOccurrence: { label: "Dangerous occurrence", pill: "bg-sky-50 text-sky-700 border border-sky-200" },
  Aquatic: { label: "Aquatic / water rescue", pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  Medical: { label: "Medical / first aid", pill: "bg-teal-50 text-teal-700 border border-teal-200" },
  Security: { label: "Security / antisocial", pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  Facility: { label: "Facility / environmental", pill: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  Other: { label: "Other", pill: "bg-slate-50 text-slate-500 border border-slate-200" },
  // Legacy values (pre-Phase-2 taxonomy). Not selectable for new reports, but
  // kept here so historical incidents still render. Forward-only — existing
  // rows keep their original type rather than being rewritten.
  PropertyDamage: { label: "Property damage", pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  ViolenceAggression: { label: "Violence / aggression", pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  HazardousSubstance: { label: "Hazardous substance", pill: "bg-teal-50 text-teal-700 border border-teal-200" },
  FireOrEvacuation: { label: "Fire / evacuation", pill: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
};

// Legacy type values tolerated when editing a historical incident (so an old
// report still validates), but never offered for a new report.
export const LEGACY_INCIDENT_TYPES = [
  "PropertyDamage",
  "ViolenceAggression",
  "HazardousSubstance",
  "FireOrEvacuation",
] as const;

// ─── Incident status (lifecycle) ────────────────────────────────────────────

export const INCIDENT_STATUSES = [
  { value: "Draft", label: "Draft" },
  { value: "AwaitingTriage", label: "Awaiting triage" },
  { value: "Open", label: "Open" },
  { value: "UnderInvestigation", label: "Under investigation" },
  { value: "Closed", label: "Closed" },
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]["value"];

// The passive queue state a Near-miss / Dangerous-occurrence report lands in on
// submit, before a manager triages it (confirms type + dual severity).
export const AWAITING_TRIAGE_STATUS = "AwaitingTriage" as const;

export const INCIDENT_STATUS_META: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  Draft: {
    label: "Draft",
    pill: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
  // Amber reads as "waiting" — distinct from the blue Open / indigo
  // Under-investigation, and never borrows the reserved risk palette.
  AwaitingTriage: {
    label: "Awaiting triage",
    pill: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
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

// Actual-outcome severity — a type-NEUTRAL impact scale (harm, operational
// disruption OR regulatory significance), so it reads sensibly for every event
// class, not just personal-injury accidents. "None" suits a near miss or a
// contained event with no real outcome. The stored enum VALUES are unchanged
// (None/Minor/Significant/Reportable/Critical) — only the display labels +
// descriptions are outcome-neutral, so no data migration is needed.
export const INCIDENT_SEVERITIES = [
  { value: "None", label: "None" },
  { value: "Minor", label: "Minor" },
  { value: "Significant", label: "Moderate" },
  { value: "Reportable", label: "Major" },
  { value: "Critical", label: "Critical" },
] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]["value"];

// Rank for sorting (low → high impact).
export const SEVERITY_RANK: Record<string, number> = {
  None: 0,
  Minor: 1,
  Significant: 2,
  Reportable: 3,
  Critical: 4,
};

export const INCIDENT_SEVERITY_META: Record<
  string,
  { label: string; description: string; pill: string; dot: string; solid: string }
> = {
  // "None" sits below the risk palette (no harm) — neutral slate, not green.
  None: {
    label: "None",
    description: "No harm and no real impact — e.g. a near miss or a contained event",
    pill: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
    solid: "bg-slate-400 text-white",
  },
  Minor: {
    label: "Minor",
    description: "Minor harm or disruption — first aid at most, quickly resolved",
    pill: "bg-low-bg text-low border border-low-line",
    dot: "bg-low",
    solid: "bg-low text-white",
  },
  Significant: {
    label: "Moderate",
    description: "Moderate harm or disruption — medical treatment, lost time, or a temporary closure",
    pill: "bg-medium-bg text-medium border border-medium-line",
    dot: "bg-medium",
    solid: "bg-medium text-white",
  },
  Reportable: {
    label: "Major",
    description: "Major harm or disruption — hospital treatment, prolonged closure, or external / HSA review",
    pill: "bg-high-bg text-high border border-high-line",
    dot: "bg-high",
    solid: "bg-high text-white",
  },
  Critical: {
    label: "Critical",
    description: "Catastrophic — fatality, life-threatening injury, or a major regulatory breach",
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

// ─── Triage (dual severity, set by a manager) ───────────────────────────────

// Sub-state recorded when a manager triages — orthogonal to the main status
// (which flips straight to Open). Null on legacy/un-triaged rows => Unreviewed.
export const TRIAGE_STATUSES = [
  { value: "Unreviewed", label: "Unreviewed" },
  { value: "Triaged", label: "Triaged" },
  { value: "ReferredToRA", label: "Referred to risk assessment" },
] as const;

export type TriageStatus = (typeof TRIAGE_STATUSES)[number]["value"];

// Hazard category for the Near-miss / Dangerous-occurrence module (captured at
// triage). Mirrors the spirit of Hazard.riskCategory but incident-flavoured.
export const HAZARD_CATEGORIES = [
  { value: "Slips", label: "Slips / trips / falls" },
  { value: "ManualHandling", label: "Manual handling" },
  { value: "Machinery", label: "Machinery / equipment" },
  { value: "Electrical", label: "Electrical" },
  { value: "Water", label: "Water / drowning" },
  { value: "Chemical", label: "Chemical / substance" },
  { value: "FireExplosion", label: "Fire / explosion" },
  { value: "Structural", label: "Structural / collapse" },
  { value: "Other", label: "Other" },
] as const;

export type HazardCategory = (typeof HAZARD_CATEGORIES)[number]["value"];

export const HAZARD_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  HAZARD_CATEGORIES.map((c) => [c.value, c.label]),
);

// Ratings 1-5 for the potential-risk axes (reuse the risk engine's labels).
export const RATINGS = [1, 2, 3, 4, 5] as const;

// ─── Close-out risk-assessment link ─────────────────────────────────────────

// How a closed incident relates to a risk assessment (see the 3 outcomes).
export const LINK_TYPES = ["ControlFailureReview", "SeededDraft"] as const;
export type IncidentRaLinkType = (typeof LINK_TYPES)[number];

// ─── Awaiting-triage age RAG ────────────────────────────────────────────────
// Colours the "how long has this waited" pill, reusing the risk band tokens.
// Phase 1 has no formal SLA — these buckets are a visual nudge, not a deadline.

export type TriageAgeBucket = {
  key: "fresh" | "due" | "overdue";
  maxHours: number;
  pill: string;
  dot: string;
};

export const TRIAGE_AGE_RAG: TriageAgeBucket[] = [
  { key: "fresh", maxHours: 24, pill: "bg-low-bg text-low border border-low-line", dot: "bg-low" },
  { key: "due", maxHours: 72, pill: "bg-medium-bg text-medium border border-medium-line", dot: "bg-medium" },
  { key: "overdue", maxHours: Infinity, pill: "bg-high-bg text-high border border-high-line", dot: "bg-high" },
];

export function triageAgeBucket(hours: number): TriageAgeBucket {
  return TRIAGE_AGE_RAG.find((b) => hours < b.maxHours) ?? TRIAGE_AGE_RAG[TRIAGE_AGE_RAG.length - 1];
}

// Humanise an elapsed-hours figure for the age pill ("5h", "2d").
export function humaniseHours(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

// ─── Per-type module vocabularies (Phase 2) ─────────────────────────────────

// Aquatic / water-rescue
export const AQUATIC_RESCUE_TYPES = [
  { value: "ReachThrow", label: "Reach / throw assist" },
  { value: "Wade", label: "Wade rescue" },
  { value: "SwimTow", label: "Swim / tow rescue" },
  { value: "Deep", label: "Deep-water rescue" },
  { value: "Spinal", label: "Spinal rescue" },
  { value: "Resuscitation", label: "Rescue with resuscitation" },
  { value: "Assist", label: "Assist / grab (no full rescue)" },
] as const;

export const EAP_LEVELS = [
  { value: "SingleGuard", label: "Single-guard response" },
  { value: "FullEap", label: "Full EAP activation" },
  { value: "PoolEvacuation", label: "Pool evacuation" },
] as const;

export const SECONDARY_DROWNING_ADVICE = [
  { value: "Given", label: "Given" },
  { value: "Refused", label: "Refused" },
  { value: "NotApplicable", label: "Not applicable" },
] as const;

// Medical — conscious / breathing observations
export const YES_NO_UNKNOWN = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Unknown", label: "Unknown" },
] as const;

// Generic helpers --------------------------------------------------------------

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
