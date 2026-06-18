// Domain enums + display metadata. Status/category colours stay in the cool
// (slate/blue/violet…) families so the risk palette (green→amber→orange→red)
// keeps its exclusive meaning for risk bands.

export const ASSESSMENT_STATUSES = [
  { value: "Draft", label: "Draft" },
  { value: "Active", label: "Active" },
  { value: "UnderReview", label: "Under review" },
  { value: "Archived", label: "Archived" },
] as const;

export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]["value"];

// What a single assessment is built around.
export const SUBJECT_TYPES = [
  { value: "Area", label: "Area" },
  { value: "Role", label: "Role" },
  { value: "Activity", label: "Activity" },
] as const;

export type SubjectType = (typeof SUBJECT_TYPES)[number]["value"];

// User roles (increasing privilege). See can() in src/lib/auth.ts.
export const ROLES = [
  { value: "Viewer", label: "Viewer" },
  { value: "Contributor", label: "Contributor" },
  { value: "Reviewer", label: "Reviewer" },
  { value: "Assessor", label: "Assessor" },
  { value: "Admin", label: "Admin" },
] as const;

export type UserRole = (typeof ROLES)[number]["value"];

export const ROLE_META: Record<
  string,
  { label: string; pill: string; description: string }
> = {
  Viewer: {
    label: "Viewer",
    pill: "bg-slate-100 text-slate-600 border border-slate-200",
    description: "Read-only access to everything.",
  },
  Contributor: {
    label: "Contributor",
    pill: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    description: "Can request reviews and add notes.",
  },
  Reviewer: {
    label: "Reviewer",
    pill: "bg-blue-50 text-blue-700 border border-blue-200",
    description: "Can review assessments, log reviews and action requests.",
  },
  Assessor: {
    label: "Assessor",
    pill: "bg-violet-50 text-violet-700 border border-violet-200",
    description: "Can create, edit and delete assessments and manage the library.",
  },
  Admin: {
    label: "Admin",
    pill: "bg-brand-soft text-brand-strong border border-brand/25",
    description: "Full access, including centres and user management.",
  },
};

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

// Per-hazard hazard category (the "Risk Category" column).
export const RISK_CATEGORIES = [
  { value: "Physical", label: "Physical" },
  { value: "Chemical", label: "Chemical" },
  { value: "Biological", label: "Biological" },
  { value: "Ergonomic", label: "Ergonomic" },
  { value: "Psychosocial", label: "Psychosocial" },
  { value: "Environmental", label: "Environmental" },
] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number]["value"];

export const RISK_CATEGORY_META: Record<string, { label: string; pill: string }> =
  {
    Physical: {
      label: "Physical",
      pill: "bg-slate-100 text-slate-700 border border-slate-200",
    },
    Chemical: {
      label: "Chemical",
      pill: "bg-sky-50 text-sky-700 border border-sky-200",
    },
    Biological: {
      label: "Biological",
      pill: "bg-violet-50 text-violet-700 border border-violet-200",
    },
    Ergonomic: {
      label: "Ergonomic",
      pill: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    },
    Psychosocial: {
      label: "Psychosocial",
      pill: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    },
    Environmental: {
      label: "Environmental",
      pill: "bg-teal-50 text-teal-700 border border-teal-200",
    },
  };

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
