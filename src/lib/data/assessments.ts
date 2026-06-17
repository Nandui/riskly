import { db } from "@/lib/db";
import { riskBand, riskScore, type RiskBand } from "@/lib/risk";
import { OPEN_ACTION_STATES } from "@/lib/constants";
import { getReviewStatus, type ReviewStatus } from "@/lib/utils";

interface HazardRatings {
  initialLikelihood: number;
  initialSeverity: number;
  residualLikelihood: number;
  residualSeverity: number;
  actionStatus: string;
  actionDueDate: Date | null;
}

export interface AssessmentSummary {
  hazardCount: number;
  maxInitialScore: number;
  maxResidualScore: number;
  headlineBand: RiskBand | null;
  openActions: number;
  overdueActions: number;
  review: ReviewStatus;
}

const isOpenAction = (status: string) =>
  (OPEN_ACTION_STATES as readonly string[]).includes(status);

export function summarizeAssessment(a: {
  hazards: HazardRatings[];
  nextReviewDate: Date | string;
}): AssessmentSummary {
  let maxInitialScore = 0;
  let maxResidualScore = 0;
  let openActions = 0;
  let overdueActions = 0;
  const today = new Date();

  for (const h of a.hazards) {
    maxInitialScore = Math.max(
      maxInitialScore,
      riskScore(h.initialLikelihood, h.initialSeverity),
    );
    maxResidualScore = Math.max(
      maxResidualScore,
      riskScore(h.residualLikelihood, h.residualSeverity),
    );
    if (isOpenAction(h.actionStatus)) {
      openActions++;
      if (h.actionDueDate && new Date(h.actionDueDate) < today) overdueActions++;
    }
  }

  return {
    hazardCount: a.hazards.length,
    maxInitialScore,
    maxResidualScore,
    headlineBand: a.hazards.length ? riskBand(maxResidualScore) : null,
    openActions,
    overdueActions,
    review: getReviewStatus(a.nextReviewDate),
  };
}

export interface AssessmentFilters {
  centerId?: string | null;
  areaId?: string;
  roleId?: string;
  activityId?: string;
  status?: string;
  band?: string;
  search?: string;
}

const listSelect = {
  center: { select: { name: true } },
  area: { select: { name: true } },
  role: { select: { name: true } },
  activity: { select: { name: true } },
  hazards: {
    select: {
      initialLikelihood: true,
      initialSeverity: true,
      residualLikelihood: true,
      residualSeverity: true,
      actionStatus: true,
      actionDueDate: true,
    },
  },
} as const;

export async function listAssessments(filters: AssessmentFilters = {}) {
  const where: Record<string, unknown> = {};
  if (filters.centerId) where.centerId = filters.centerId;
  if (filters.areaId) where.areaId = filters.areaId;
  if (filters.roleId) where.roleId = filters.roleId;
  if (filters.activityId) where.activityId = filters.activityId;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q } },
      { reference: { contains: q } },
      { description: { contains: q } },
      { hazards: { some: { hazardDescription: { contains: q } } } },
    ];
  }

  const rows = await db.riskAssessment.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: listSelect,
  });

  const enriched = rows.map((r) => ({ ...r, summary: summarizeAssessment(r) }));

  if (filters.band) {
    return enriched.filter((r) => r.summary.headlineBand === filters.band);
  }
  return enriched;
}

export type AssessmentRow = Awaited<ReturnType<typeof listAssessments>>[number];

export async function getAssessmentDetail(id: string) {
  return db.riskAssessment.findUnique({
    where: { id },
    include: {
      center: true,
      area: true,
      role: true,
      activity: true,
      hazards: { orderBy: { sortOrder: "asc" } },
      reviewLogs: { orderBy: { reviewedDate: "desc" } },
    },
  });
}

export type AssessmentDetail = NonNullable<
  Awaited<ReturnType<typeof getAssessmentDetail>>
>;

// Centres + their areas + org roles/activities, for the assessment form selects.
export async function getAssessmentFormData() {
  const [centers, roles, activities] = await Promise.all([
    db.center.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        areas: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    }),
    db.role.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.activity.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const areasByCenter: Record<string, { id: string; name: string }[]> = {};
  for (const c of centers) areasByCenter[c.id] = c.areas;

  return {
    centers: centers.map((c) => ({ id: c.id, name: c.name })),
    areasByCenter,
    roles,
    activities,
  };
}

export async function nextReference(): Promise<string> {
  const rows = await db.riskAssessment.findMany({
    select: { reference: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = r.reference.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `RA-${String(max + 1).padStart(4, "0")}`;
}
