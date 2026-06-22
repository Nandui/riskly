// Pure, client-safe helpers for the "related hazards" feature — shared by the
// incident detail page (server), the hazards manager (client) and the PDF
// export. Only type-only imports, so it's safe everywhere.

import type {
  IncidentHazardLinkDetail,
  IncidentHazardLinkItem,
} from "@/lib/incidents/types";

// The human reference for a hazard: RA-XX-0001-HZ-001. Mirrors the assessment
// views (assessment-view, copy-hazards-modal, assessment-report).
export function hazardReference(assessmentRef: string, seq: number): string {
  return `${assessmentRef}-HZ-${String(seq).padStart(3, "0")}`;
}

// An assessment is named after its subject (area / role / activity). A
// client-safe twin of assessmentTitle() in src/lib/data/assessments.ts.
export function assessmentSubjectTitle(a: {
  subjectType: string;
  area?: { name: string } | null;
  role?: { name: string } | null;
  activity?: { name: string } | null;
}): string {
  if (a.subjectType === "Role") return a.role?.name ?? "Untitled";
  if (a.subjectType === "Activity") return a.activity?.name ?? "Untitled";
  return a.area?.name ?? "Untitled";
}

// Flatten a loaded hazard link into the display-ready item used everywhere.
export function describeIncidentHazardLink(
  link: IncidentHazardLinkDetail,
): IncidentHazardLinkItem {
  const { hazard } = link;
  const { assessment } = hazard;
  return {
    id: link.id,
    hazardId: link.hazardId,
    hazardRef: hazardReference(assessment.reference, hazard.seq),
    title: hazard.hazard,
    riskCategory: hazard.riskCategory,
    likelihood: hazard.likelihood,
    severity: hazard.severity,
    areaId: assessment.areaId,
    areaName: assessment.area?.name ?? null,
    assessmentId: assessment.id,
    assessmentReference: assessment.reference,
    assessmentTitle: assessmentSubjectTitle(assessment),
    note: link.note,
  };
}
