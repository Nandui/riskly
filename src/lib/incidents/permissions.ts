// Incident permissions, expressed in terms of Riskly's existing role/capability
// model (src/lib/permissions.ts) — no new roles. Client-safe.
//
//   view          → read incidents & the incident dashboard
//   requestReview → report, edit, and manage people / follow-up actions
//   review        → investigate (change status) and close incidents
//   admin         → delete incidents, reassign the reporter, manage locations
//
// One place to read the mapping; used by both server guards and the UI.

import { can } from "@/lib/permissions";

type U = { role: string } | null | undefined;

export const canViewIncidents = (u: U) => can(u, "view");
export const canManageIncidents = (u: U) => can(u, "requestReview");
export const canInvestigateIncidents = (u: U) => can(u, "review");
export const canAdminIncidents = (u: U) => can(u, "admin");
