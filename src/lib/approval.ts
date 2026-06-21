// Shared bits for the two-tier sign-off (Owner + CEO). An assessment is in
// force ("Approved") only once BOTH sign-offs are present.

import { differenceInCalendarDays } from "date-fns";

// Null-out both approvals — spread into a Prisma update when an edit
// invalidates prior sign-off.
export const CLEARED_APPROVAL = {
  ownerApprovedByName: null,
  ownerApprovedById: null,
  ownerApprovedAt: null,
  ceoApprovedByName: null,
  ceoApprovedById: null,
  ceoApprovedAt: null,
};

// Minimal select to read the approval flags.
export const APPROVAL_FLAGS_SELECT = {
  ownerApprovedByName: true,
  ceoApprovedByName: true,
} as const;

// Fully approved = both the Owner and the CEO have signed off.
export function isApproved(a: {
  ownerApprovedByName?: string | null;
  ceoApprovedByName?: string | null;
}): boolean {
  return Boolean(a.ownerApprovedByName && a.ceoApprovedByName);
}

// Any sign-off present (used to decide whether an edit invalidates approval).
export function hasAnyApproval(a: {
  ownerApprovedByName?: string | null;
  ceoApprovedByName?: string | null;
}): boolean {
  return Boolean(a.ownerApprovedByName || a.ceoApprovedByName);
}

// The derived status for an assessment in the active lifecycle (i.e. not an
// explicit Draft or Archived): "Approved" only when both sign-offs are present
// AND it isn't past its next review date; otherwise "Under review".
export function liveStatus(a: {
  ownerApprovedByName?: string | null;
  ceoApprovedByName?: string | null;
  nextReviewDate: Date | string;
}): "Approved" | "UnderReview" {
  const overdue =
    differenceInCalendarDays(new Date(a.nextReviewDate), new Date()) < 0;
  return isApproved(a) && !overdue ? "Approved" : "UnderReview";
}
