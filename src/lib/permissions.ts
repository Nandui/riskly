// Pure, client-safe permission logic (no server imports) so both server code
// and client components (e.g. the sidebar) can gate by role.

export type Capability =
  | "view"
  | "requestReview"
  | "review"
  | "editContent"
  | "admin";

// Roles form a strict hierarchy of increasing privilege.
const ROLE_RANK: Record<string, number> = {
  Viewer: 0,
  Contributor: 1,
  Reviewer: 2,
  Assessor: 3,
  Admin: 4,
};

const CAP_RANK: Record<Capability, number> = {
  view: 0,
  requestReview: 1,
  review: 2,
  editContent: 3,
  admin: 4,
};

export function can(
  user: { role: string } | null | undefined,
  capability: Capability,
): boolean {
  if (!user) return false;
  return (ROLE_RANK[user.role] ?? 0) >= CAP_RANK[capability];
}
