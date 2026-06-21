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
  { value: "MissingChild", label: "Missing Child (Code Amber)" },
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
  // Rose — deliberately not amber and not the reserved severity ramp, despite
  // the protocol being named "amber".
  MissingChild: { label: "Missing Child (Code Amber)", pill: "bg-rose-50 text-rose-700 border border-rose-200" },
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
  { value: "Open", label: "Open" },
  { value: "UnderInvestigation", label: "Under investigation" },
  { value: "Closed", label: "Closed" },
  { value: "Imported", label: "Imported" },
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
  // Retired status — no new incidents enter it, but kept here so any historical
  // record still renders a sane badge (mirrors how legacy types are retained).
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
  // A historical record entered by an admin from a previous system — it never
  // went through this tool's investigation lifecycle.
  Imported: {
    label: "Imported",
    pill: "bg-stone-100 text-stone-600 border border-stone-300",
    dot: "bg-stone-400",
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

// Statuses that are resolved / not awaiting any action — excluded from the
// "still open" attention metrics. Imported historical records sit here too.
export const INACTIVE_INCIDENT_STATUSES = ["Closed", "Imported"] as const;

// ─── Evidence / information requests (investigation) ────────────────────────

// A tracked request raised while investigating — pull CCTV before it's
// overwritten, or ask someone for a statement / detail.
export const EVIDENCE_REQUEST_KINDS = [
  { value: "CCTV", label: "CCTV footage" },
  { value: "Information", label: "Information / statement" },
] as const;

export type EvidenceRequestKind = (typeof EVIDENCE_REQUEST_KINDS)[number]["value"];

export const EVIDENCE_REQUEST_STATUSES = [
  { value: "Requested", label: "Requested" },
  { value: "Received", label: "Received" },
  { value: "Reviewed", label: "Reviewed" },
  { value: "Unavailable", label: "Unavailable" },
] as const;

export type EvidenceRequestStatus =
  (typeof EVIDENCE_REQUEST_STATUSES)[number]["value"];

// Cool / neutral hues — the risk (green→red) palette stays reserved for severity.
export const EVIDENCE_REQUEST_STATUS_META: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  Requested: {
    label: "Requested",
    pill: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  Received: {
    label: "Received",
    pill: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  Reviewed: {
    label: "Reviewed",
    pill: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
  Unavailable: {
    label: "Unavailable",
    pill: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-400",
  },
};

// Statuses where a request is still outstanding (footage not yet secured).
export const OPEN_EVIDENCE_REQUEST_STATUSES = ["Requested"] as const;

// ─── Close-out risk-assessment link ─────────────────────────────────────────

// How a closed incident relates to a risk assessment (see the 3 outcomes).
export const LINK_TYPES = ["ControlFailureReview", "SeededDraft"] as const;
export type IncidentRaLinkType = (typeof LINK_TYPES)[number];

// Humanise an elapsed-hours figure for a report-gap pill ("5h", "2d").
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

// Capture "Was anyone hurt?" — a plain outcome the reporter taps instead of
// grading a severity band. Maps to the actual-outcome severity value; a manager
// can confirm (and can escalate to Critical) during the investigation.
export const HARM_OUTCOMES = [
  { value: "None", label: "No one was hurt", sub: "no injury", severity: "None" },
  { value: "FirstAid", label: "First aid only", sub: "minor, dealt with on site", severity: "Minor" },
  { value: "Doctor", label: "Needed a doctor or hospital", sub: "GP, A&E or admitted", severity: "Significant" },
  { value: "Serious", label: "Serious or life-threatening", sub: "major injury or worse", severity: "Reportable" },
] as const;

export function severityFromOutcome(outcome: string): string {
  return HARM_OUTCOMES.find((o) => o.value === outcome)?.severity ?? "None";
}

// Accident — mechanism / kind of accident (the trendable cause dimension; the
// narrative carries the specifics, so this stays a fixed list).
export const ACCIDENT_MECHANISMS = [
  { value: "SlipTripFall", label: "Slip, trip or fall (same level)" },
  { value: "FallFromHeight", label: "Fall from height" },
  { value: "StruckByObject", label: "Struck by a moving / falling object" },
  { value: "StruckAgainst", label: "Struck against something fixed (poolside, wall, equipment)" },
  { value: "ManualHandling", label: "Manual handling / lifting" },
  { value: "ContactSharpHot", label: "Cut, burn or abrasion (sharp / hot surface)" },
  { value: "HarmfulSubstance", label: "Exposure to or contact with a harmful substance (ingestion, inhalation, splash)" },
  { value: "CaughtCrush", label: "Caught in or between (crush / trap)" },
  { value: "SportActivityContact", label: "Contact during sport or activity" },
  { value: "Overexertion", label: "Overexertion / strain" },
  { value: "Other", label: "Other" },
] as const;

// Missing Child (Code Amber) — de-identified operational vocabularies.
export const MISSING_CHILD_SETTINGS = [
  { value: "Pool", label: "Pool / public swim" },
  { value: "SwimLesson", label: "Swim lesson" },
  { value: "Creche", label: "Crèche" },
  { value: "Camp", label: "Camp" },
  { value: "SoftPlay", label: "Soft play" },
  { value: "ChangingVillage", label: "Changing village" },
  { value: "Other", label: "Other" },
] as const;

export const CHILD_AGE_BANDS = [
  { value: "Under4", label: "Under 4" },
  { value: "Age4to7", label: "4–7" },
  { value: "Age8to11", label: "8–11" },
  { value: "Age12Plus", label: "12+" },
] as const;

// Where the child was found — a CLASS (not free text). Deliberately NO in-water
// value: a child found in or under the water is a rescue, logged as Aquatic.
export const FOUND_LOCATION_CLASSES = [
  { value: "Showers", label: "Showers" },
  { value: "ChangingVillage", label: "Changing village" },
  { value: "OtherWetArea", label: "Other wet area (poolside, etc.)" },
  { value: "DryAreaOnSite", label: "Dry area on site" },
  { value: "Creche", label: "Crèche" },
  { value: "LeftSite", label: "Had left the site" },
  { value: "Other", label: "Other" },
] as const;

export const WATER_PROXIMITY = [
  { value: "AtWaterEdge", label: "At the water's edge" },
  { value: "WetAreaNotWater", label: "Wet area, not the water" },
  { value: "AwayFromWater", label: "Away from water" },
] as const;

export const MC_RESPONSE_ACTIONS = [
  { value: "TannoyAnnouncement", label: "Tannoy announcement" },
  { value: "EntrancesSecured", label: "Entrances secured" },
  { value: "CCTVReviewed", label: "CCTV reviewed" },
] as const;

export const MISSING_CHILD_RESOLUTIONS = [
  { value: "FoundSafeOnSite", label: "Found safe on site" },
  { value: "FoundWithGuardian", label: "Found with guardian" },
  { value: "NeverAttendedFoundElsewhere", label: "Never attended — found elsewhere on site" },
  { value: "LeftPremises", label: "Had left the premises" },
  { value: "FoundInjured", label: "Found injured (logged on a linked record)" },
  { value: "PoliceHandover", label: "Handed to Gardaí / police" },
  { value: "Other", label: "Other" },
] as const;

// Root-cause taxonomy in NON-WELFARE policy terms. Fixed enum so it can never
// smuggle welfare detail (e.g. a guardian sending a minor encodes as
// AdultCollectionPolicyBreach, nothing more). Retained for display of any
// historical record that captured it.
export const SUPERVISION_CAUSES = [
  { value: "AdultCollectionPolicyBreach", label: "Adult bring/collect policy not followed" },
  { value: "RatioOrStaffingGap", label: "Supervision ratio / staffing gap" },
  { value: "AccessControlGap", label: "Access-control gap" },
  { value: "ChildWanderedUnnoticed", label: "Child wandered unnoticed" },
  { value: "RegisterRollCallGap", label: "Register / roll-call gap" },
  { value: "UnaccountedTransition", label: "Unaccounted transition (e.g. lesson → changing)" },
  { value: "None", label: "No control failure identified" },
  { value: "Other", label: "Other" },
] as const;

// Generic helpers --------------------------------------------------------------

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
