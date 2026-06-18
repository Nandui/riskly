"use server";

import {
  getAssessmentDetail,
  summarizeAssessment,
  assessmentTitle,
} from "@/lib/data/assessments";
import { getCurrentUser, can } from "@/lib/auth";
import { riskScore, riskBand } from "@/lib/risk";
import { formatDate, formatDateTime } from "@/lib/utils";
import { REVIEW_FREQUENCY_OPTIONS } from "@/lib/constants";

// Lean, fully-serialisable payload for the right-side assessment drawer.
export async function getAssessmentDrawerData(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const a = await getAssessmentDetail(id);
  if (!a) return null;

  const summary = summarizeAssessment(a);

  return {
    id: a.id,
    reference: a.reference,
    status: a.status,
    title: assessmentTitle(a),
    subjectType: a.subjectType,
    centerName: a.center.name,
    description: a.description,
    assessorName: a.assessorName,
    assessmentDate: formatDate(a.assessmentDate),
    reviewFrequencyLabel:
      REVIEW_FREQUENCY_OPTIONS.find((o) => o.value === a.reviewFrequencyMonths)
        ?.label ?? `Every ${a.reviewFrequencyMonths} months`,
    nextReviewDate: formatDate(a.nextReviewDate),
    review: summary.review,
    overallScore: summary.overallScore,
    headlineBand: summary.headlineBand,
    hazardCount: summary.hazardCount,
    highRiskCount: summary.highRiskCount,
    approvedByName: a.approvedByName,
    approvedAt: a.approvedAt ? formatDate(a.approvedAt) : null,
    owner: a.owner
      ? { id: a.owner.id, name: a.owner.name, email: a.owner.email }
      : null,
    department: a.department?.name ?? null,
    hazards: a.hazards.map((h) => {
      const score = riskScore(h.likelihood, h.severity);
      return {
        id: h.id,
        hazard: h.hazard,
        category: h.riskCategory,
        score,
        band: riskBand(score),
      };
    }),
    audit: a.auditLogs.map((e) => ({
      id: e.id,
      action: e.action,
      detail: e.detail,
      userName: e.userName,
      createdAt: formatDateTime(e.createdAt),
    })),
    canEdit: can(user, "editContent"),
    canApprove: can(user, "review"),
  };
}

export type AssessmentDrawerData = NonNullable<
  Awaited<ReturnType<typeof getAssessmentDrawerData>>
>;
