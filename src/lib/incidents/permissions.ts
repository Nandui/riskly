// Incident permissions, expressed in terms of the capability model
// (src/lib/permissions.ts). Client-safe.
//
//   view                 → read incidents & the incident dashboard (everyone)
//   reportIncidents      → submit an incident report
//   manageIncidents      → edit, record people involved, add/complete actions
//   investigateIncidents → change status, close and re-open
//   admin                → delete incidents, reassign the reporter, manage locations
//
// One place to read the mapping; used by both server guards and the UI.

import { can } from "@/lib/permissions";

type U = { role: string } | null | undefined;

export const canViewIncidents = (u: U) => can(u, "view");
export const canReportIncidents = (u: U) => can(u, "reportIncidents");
export const canManageIncidents = (u: U) => can(u, "manageIncidents");
export const canInvestigateIncidents = (u: U) => can(u, "investigateIncidents");
// Triage reuses the existing investigate capability (no new role in Phase 1).
export const canTriageIncidents = (u: U) => can(u, "investigateIncidents");
export const canAdminIncidents = (u: U) => can(u, "admin");
