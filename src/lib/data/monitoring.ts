import { db } from "@/lib/db";
import { listAssessments, type AssessmentRow } from "@/lib/data/assessments";
import { clampRating, riskScore, riskBand, isHighRisk } from "@/lib/risk";
import { ASSESSMENT_STATUSES } from "@/lib/constants";

export async function getDashboard(centerId: string | null) {
  const rows = await listAssessments({ centerId });
  const active = rows.filter((a) => a.status !== "Archived");

  const statusCounts: Record<string, number> = {};
  for (const s of ASSESSMENT_STATUSES) statusCounts[s.value] = 0;
  for (const a of rows) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;

  const bandCounts = { low: 0, medium: 0, high: 0, veryHigh: 0 };
  for (const a of active)
    if (a.summary.headlineBand) bandCounts[a.summary.headlineBand]++;

  const matrix: Record<string, number> = {};
  let hazardCount = 0;
  let highRiskHazards = 0;
  for (const a of active)
    for (const h of a.hazards) {
      const key = `${clampRating(h.likelihood)}-${clampRating(h.severity)}`;
      matrix[key] = (matrix[key] ?? 0) + 1;
      hazardCount++;
      if (isHighRisk(riskScore(h.likelihood, h.severity))) highRiskHazards++;
    }

  const reviewsOverdue = active.filter(
    (a) => a.summary.review.key === "overdue",
  ).length;
  const reviewsDue = active.filter((a) => a.summary.review.key === "due").length;

  const attention = active
    .filter(
      (a) =>
        a.summary.review.key === "overdue" || a.summary.review.key === "due",
    )
    .sort((x, y) => x.summary.review.days - y.summary.review.days)
    .slice(0, 6);

  const recent = rows.slice(0, 5);

  const openRequests = await db.reviewRequest.count({
    where: {
      status: "Open",
      assessment: {
        status: { not: "Archived" },
        ...(centerId ? { centerId } : {}),
      },
    },
  });

  const categoryGroups = await db.hazard.groupBy({
    by: ["riskCategory"],
    where: {
      assessment: {
        status: { not: "Archived" },
        ...(centerId ? { centerId } : {}),
      },
    },
    _count: { _all: true },
  });
  const categoryCounts = categoryGroups
    .map((g) => ({ category: g.riskCategory, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return {
    total: rows.length,
    activeCount: active.length,
    statusCounts,
    bandCounts,
    matrix,
    hazardCount,
    highRiskHazards,
    reviewsOverdue,
    reviewsDue,
    openRequests,
    categoryCounts,
    attention,
    recent,
  };
}

export type ReviewQueueItem = AssessmentRow;

export async function getReviewQueue(
  centerId: string | null,
): Promise<ReviewQueueItem[]> {
  const rows = await listAssessments({ centerId });
  return rows
    .filter(
      (a) =>
        a.status !== "Archived" &&
        (a.summary.review.key === "overdue" || a.summary.review.key === "due"),
    )
    .sort((x, y) => x.summary.review.days - y.summary.review.days);
}

export async function getHighRiskHazards(centerId: string | null) {
  const hazards = await db.hazard.findMany({
    where: {
      assessment: {
        status: { not: "Archived" },
        ...(centerId ? { centerId } : {}),
      },
    },
    include: {
      assessment: {
        select: {
          id: true,
          reference: true,
          subjectType: true,
          center: { select: { name: true } },
          area: { select: { name: true } },
          role: { select: { name: true } },
          activity: { select: { name: true } },
        },
      },
    },
  });

  return hazards
    .map((h) => {
      const score = riskScore(h.likelihood, h.severity);
      return { ...h, score, band: riskBand(score) };
    })
    .filter((h) => isHighRisk(h.score))
    .sort((a, b) => b.score - a.score);
}

export type HighRiskHazard = Awaited<
  ReturnType<typeof getHighRiskHazards>
>[number];

export async function getOpenReviewRequests(centerId: string | null) {
  return db.reviewRequest.findMany({
    where: {
      status: "Open",
      assessment: {
        status: { not: "Archived" },
        ...(centerId ? { centerId } : {}),
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      requestedBy: { select: { name: true, email: true } },
      assessment: {
        select: {
          id: true,
          reference: true,
          subjectType: true,
          center: { select: { name: true } },
          area: { select: { name: true } },
          role: { select: { name: true } },
          activity: { select: { name: true } },
        },
      },
    },
  });
}

export type OpenReviewRequest = Awaited<
  ReturnType<typeof getOpenReviewRequests>
>[number];

// Non-archived assessments the given user owns.
export async function getOwnedByMe(
  userId: string,
  centerId: string | null,
): Promise<AssessmentRow[]> {
  const rows = await listAssessments({ centerId, ownedByUserId: userId });
  return rows.filter((a) => a.status !== "Archived");
}

// Assessments the user owns that are back Under review (e.g. a hazard was
// added) — they need the owner to re-check and get them re-approved.
export async function getNeedsAction(
  userId: string,
  centerId: string | null,
): Promise<AssessmentRow[]> {
  const rows = await listAssessments({ centerId, ownedByUserId: userId });
  return rows.filter((a) => a.status === "UnderReview");
}
