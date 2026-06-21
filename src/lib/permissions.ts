// Pure, client-safe permission logic (no server imports) so both server code
// and client components (e.g. the sidebar) can gate by role.
//
// Roles are NOT a strict hierarchy: the CEO can approve assessments but only
// *views* incidents, while a Shift Supervisor reports incidents but can't
// request assessment reviews. So each role lists exactly what it can do, and
// the Operations Manager (the admin) is granted everything — current and
// future — via the "admin" wildcard in can().

export type Capability =
  // Risk assessments
  | "view" // see assessments, incidents and dashboards (read)
  | "requestReview" // raise assessment / hazard review requests
  | "review" // log reviews, resolve requests, change assessment status
  | "approveAssessments" // grant the CEO sign-off
  | "editContent" // create/edit/delete assessments & hazards; manage the library
  // Incidents
  | "reportIncidents" // submit incident reports
  | "manageIncidents" // add people involved; add/complete follow-up actions; edit
  | "investigateIncidents" // change incident status, close and re-open
  // Cross-cutting
  | "admin"; // centres, users, locations — full access

// Explicit role → capability grants (the single source of truth, mirrored by
// the role-permission matrix on the Users page).
const ROLE_CAPS: Record<string, Capability[]> = {
  "Shift Supervisor": ["view", "reportIncidents"],
  "Duty Manager": ["view", "requestReview", "reportIncidents", "manageIncidents"],
  "Department Supervisor": [
    "view",
    "requestReview",
    "reportIncidents",
    "manageIncidents",
  ],
  CEO: ["view", "approveAssessments"],
  // Operations Manager is the admin — "admin" is a wildcard granting every
  // capability, so future capabilities are included automatically.
  "Operations Manager": ["admin"],
};

export function can(
  user: { role: string } | null | undefined,
  capability: Capability,
): boolean {
  if (!user) return false;
  const caps = ROLE_CAPS[user.role];
  if (!caps) return false;
  if (caps.includes("admin")) return true; // admin sees & does everything
  return caps.includes(capability);
}

// Ordered capability metadata — the single source for the role permissions
// matrix on the Users page.
export const CAPABILITIES: {
  key: Capability;
  label: string;
  description: string;
}[] = [
  {
    key: "view",
    label: "View everything",
    description: "Risk assessments, incidents and dashboards",
  },
  {
    key: "requestReview",
    label: "Request reviews",
    description: "Raise assessment & hazard review requests",
  },
  {
    key: "approveAssessments",
    label: "Approve assessments",
    description: "Grant the CEO sign-off on an assessment",
  },
  {
    key: "review",
    label: "Review assessments",
    description: "Log reviews, resolve requests and change assessment status",
  },
  {
    key: "editContent",
    label: "Manage assessments",
    description: "Create, edit and delete assessments, hazards and the library",
  },
  {
    key: "reportIncidents",
    label: "Report incidents",
    description: "Submit incident reports",
  },
  {
    key: "manageIncidents",
    label: "Manage incidents",
    description: "Record people involved and complete follow-up actions",
  },
  {
    key: "investigateIncidents",
    label: "Investigate incidents",
    description: "Change incident status, close and re-open incidents",
  },
  {
    key: "admin",
    label: "Administer",
    description: "Manage centres, users and locations — full access",
  },
];
