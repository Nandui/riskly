// Domain enums + display metadata. Status/action colours stay in the cool
// (slate/teal/blue) or Tailwind default families so the risk palette
// (green→amber→orange→red) keeps its exclusive meaning.

export const ASSESSMENT_STATUSES = [
  { value: "Draft", label: "Draft" },
  { value: "Active", label: "Active" },
  { value: "UnderReview", label: "Under review" },
  { value: "Archived", label: "Archived" },
] as const;

export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]["value"];

export const STATUS_META: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  Draft: {
    label: "Draft",
    pill: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
  Active: {
    label: "Active",
    pill: "bg-brand-soft text-brand-strong border border-brand/25",
    dot: "bg-brand",
  },
  UnderReview: {
    label: "Under review",
    pill: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  Archived: {
    label: "Archived",
    pill: "bg-slate-50 text-slate-400 border border-slate-200",
    dot: "bg-slate-300",
  },
};

export const ACTION_STATUSES = [
  { value: "NA", label: "N/A" },
  { value: "Open", label: "Open" },
  { value: "InProgress", label: "In progress" },
  { value: "Done", label: "Done" },
] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number]["value"];

export const ACTION_STATUS_META: Record<
  string,
  { label: string; pill: string }
> = {
  NA: { label: "N/A", pill: "bg-slate-100 text-slate-500 border border-slate-200" },
  Open: { label: "Open", pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  InProgress: {
    label: "In progress",
    pill: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  Done: {
    label: "Done",
    pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
};

// Action states that still need attention (count toward "open actions").
export const OPEN_ACTION_STATES = ["Open", "InProgress"] as const;

export const REVIEW_OUTCOMES = [
  { value: "NoChanges", label: "No changes needed" },
  { value: "Updated", label: "Updated" },
  { value: "Escalated", label: "Escalated" },
] as const;

export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number]["value"];

export const REVIEW_FREQUENCY_OPTIONS = [
  { value: 1, label: "Monthly" },
  { value: 3, label: "Every 3 months" },
  { value: 6, label: "Every 6 months" },
  { value: 12, label: "Annually" },
  { value: 24, label: "Every 2 years" },
  { value: 36, label: "Every 3 years" },
] as const;

export const DUE_SOON_DAYS = 30;
