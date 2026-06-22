// Serializable shapes returned by the incidents data layer and consumed by
// server + client components. Type-only Prisma imports are erased at compile, so
// this file is safe to import from client components.

import type {
  Activity,
  Area,
  Center,
  EvidenceRequest,
  FollowUpAction,
  Hazard,
  Incident,
  IncidentHazardLink,
  InjuredParty,
  RiskAssessment,
  Role,
  Witness,
} from "@prisma/client";

export type { EvidenceRequest, FollowUpAction, InjuredParty, Witness };

// ─── Linked hazards (investigation: hazards related to the incident) ─────────

// A hazard link with the hazard and its parent assessment fully loaded — what
// getIncidentDetail returns for the "related hazards" card.
export type IncidentHazardLinkDetail = IncidentHazardLink & {
  hazard: Hazard & {
    assessment: RiskAssessment & {
      area: Area | null;
      role: Role | null;
      activity: Activity | null;
    };
  };
};

// Flattened, display-ready shape for the linked-hazard list, the picker's
// "already selected" set, and the PDF export.
export type IncidentHazardLinkItem = {
  id: string; // the link id (for removal)
  hazardId: string;
  hazardRef: string; // RA-XX-0001-HZ-001
  title: string; // the hazard text
  riskCategory: string;
  likelihood: number;
  severity: number;
  areaId: string | null; // the assessment's area (null for role/activity scope)
  areaName: string | null;
  assessmentId: string;
  assessmentReference: string;
  assessmentTitle: string;
  note: string | null;
};

// A hazard offered in the "link hazards" picker, scoped to the incident's
// centre and tagged with its area so the dialog can filter by area.
export type LinkableHazard = {
  id: string;
  hazardRef: string;
  title: string;
  riskCategory: string;
  likelihood: number;
  severity: number;
  areaId: string | null;
  areaName: string | null;
  assessmentId: string;
  assessmentReference: string;
  assessmentTitle: string;
};

// ─── Incident list (table rows, dashboard panels) ───────────────────────────

export type IncidentListItem = {
  id: string;
  reference: string;
  type: string;
  severity: string;
  status: string;
  location: string;
  locationDetail: string | null;
  occurredAt: Date;
  reportedBy: string;
  centerId: string;
  centerName: string;
  centerSiteCode: string | null;
  injuredCount: number;
  witnessCount: number;
  openActionCount: number;
  totalActionCount: number;
};

// ─── Incident detail (full record + relations) ──────────────────────────────

export type IncidentDetail = Incident & {
  center: Center;
  witnesses: Witness[];
  injuredParties: InjuredParty[];
  followUpActions: FollowUpAction[];
  evidenceRequests: EvidenceRequest[];
  hazardLinks: IncidentHazardLinkDetail[];
};

// ─── Location options for the cascading area / sub-area pickers ──────────────

export type AreaOption = {
  id: string;
  centerId: string;
  name: string;
  subAreas: { id: string; name: string }[];
};

// Reporter options (admins only) for the incident form.
export type UserOption = { id: string; name: string };

// ─── Cross-incident follow-up action row (actions overview) ─────────────────

export type ActionListItem = {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: string;
  completedAt: Date | null;
  completedBy: string | null;
  notes: string;
  incidentId: string;
  incidentRef: string;
  incidentLocation: string;
  centerId: string;
  centerName: string;
};

// ─── Dashboard ──────────────────────────────────────────────────────────────

export type IncidentDashboardStats = {
  total: number;
  open: number; // Open + UnderInvestigation
  overdueActions: number;
  reportableOpen: number; // Reportable/Critical and not closed
  injured: number; // injured people across in-scope incidents
};

export type AttentionAction = {
  incidentId: string;
  reference: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  daysOverdue: number;
};

export type AttentionIncident = {
  id: string;
  reference: string;
  severity: string;
  location: string;
  occurredAt: Date;
  openActions: number;
};

export type DistributionItem = { label: string; value: string; count: number };

export type IncidentDashboardData = {
  total: number;
  stats: IncidentDashboardStats;
  statusCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  typeCounts: DistributionItem[];
  locationCounts: DistributionItem[];
  activity: { month: string; count: number }[];
  overdueActions: AttentionAction[];
  overdueActionsTotal: number;
  reportableOpen: AttentionIncident[];
  reportableOpenTotal: number;
  recent: IncidentListItem[];
};
