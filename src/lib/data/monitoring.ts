import { db } from "@/lib/db";
import { listAssessments, type AssessmentRow } from "@/lib/data/assessments";
import { clampRating } from "@/lib/risk";
import { ASSESSMENT_STATUSES, OPEN_ACTION_STATES } from "@/lib/constants";

export async function getDashboard(centerId: string | null) {
  const rows = await listAssessments({ centerId });
  const active = rows.filter((a) => a.status !== "Archived");

  const statusCounts: Record<string, number> = {};
  for (const s of ASSESSMENT_STATUSES) statusCounts[s.value] = 0;
  for (const a of rows) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;

  const bandCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const a of active)
    if (a.summary.headlineBand) bandCounts[a.summary.headlineBand]++;

  const matrix: Record<string, number> = {};
  let hazardCount = 0;
  for (const a of active)
    for (const h of a.hazards) {
      const key = `${clampRating(h.residualLikelihood)}-${clampRating(h.residualSeverity)}`;
      matrix[key] = (matrix[key] ?? 0) + 1;
      hazardCount++;
    }

  const reviewsOverdue = active.filter(
    (a) => a.summary.review.key === "overdue",
  ).length;
  const reviewsDue = active.filter((a) => a.summary.review.key === "due").length;
  const openActions = active.reduce((n, a) => n + a.summary.openActions, 0);
  const overdueActions = active.reduce(
    (n, a) => n + a.summary.overdueActions,
    0,
  );

  const attention = active
    .filter((a) => a.summary.review.key !== "ok")
    .sort((x, y) => x.summary.review.days - y.summary.review.days)
    .slice(0, 6);

  const recent = rows.slice(0, 5);

  return {
    total: rows.length,
    activeCount: active.length,
    statusCounts,
    bandCounts,
    matrix,
    hazardCount,
    reviewsOverdue,
    reviewsDue,
    openActions,
    overdueActions,
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
    .filter((a) => a.status !== "Archived" && a.summary.review.key !== "ok")
    .sort((x, y) => x.summary.review.days - y.summary.review.days);
}

export async function getOpenActions(centerId: string | null) {
  const hazards = await db.hazard.findMany({
    where: {
      actionStatus: { in: [...OPEN_ACTION_STATES] },
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
          title: true,
          status: true,
          center: { select: { name: true } },
          area: { select: { name: true } },
        },
      },
    },
  });

  const today = new Date();
  return hazards
    .map((h) => ({
      ...h,
      overdue: !!(h.actionDueDate && new Date(h.actionDueDate) < today),
    }))
    .sort((a, b) => {
      const ad = a.actionDueDate
        ? new Date(a.actionDueDate).getTime()
        : Infinity;
      const bd = b.actionDueDate
        ? new Date(b.actionDueDate).getTime()
        : Infinity;
      return ad - bd;
    });
}

export type OpenAction = Awaited<ReturnType<typeof getOpenActions>>[number];
