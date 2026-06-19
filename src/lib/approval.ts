// Shared bits for the two-tier sign-off (Owner + CEO). An assessment is
// "approved" / in force once EITHER approval is present.

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

// Minimal select to test whether an assessment is currently approved.
export const APPROVAL_FLAGS_SELECT = {
  ownerApprovedByName: true,
  ceoApprovedByName: true,
} as const;

export function isApproved(a: {
  ownerApprovedByName?: string | null;
  ceoApprovedByName?: string | null;
}): boolean {
  return Boolean(a.ownerApprovedByName || a.ceoApprovedByName);
}
