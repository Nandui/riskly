import { db } from "@/lib/db";
import { riskBand, riskScore, isHighRisk, type RiskBand } from "@/lib/risk";
import { getReviewStatus, type ReviewStatus } from "@/lib/utils";

// An assessment is named after its subject (the area/role/activity it covers).
export function assessmentTitle(a: {
  subjectType: string;
  area?: { name: string } | null;
  role?: { name: string } | null;
  activity?: { name: string } | null;
}): string {
  if (a.subjectType === "Role") return a.role?.name ?? "Untitled";
  if (a.subjectType === "Activity") return a.activity?.name ?? "Untitled";
  return a.area?.name ?? "Untitled";
}

interface HazardRatings {
  likelihood: number;
  severity: number;
}

export interface AssessmentSummary {
  hazardCount: number;
  overallScore: number;
  headlineBand: RiskBand | null;
  highRiskCount: number;
  review: ReviewStatus;
}

export function summarizeAssessment(a: {
  hazards: HazardRatings[];
  nextReviewDate: Date | string;
}): AssessmentSummary {
  let scoreSum = 0;
  let highRiskCount = 0;

  for (const h of a.hazards) {
    const score = riskScore(h.likelihood, h.severity);
    scoreSum += score;
    if (isHighRisk(score)) highRiskCount++;
  }

  // Overall risk = the average of every hazard's score (rounded), so the
  // headline reflects the assessment as a whole, not just its worst hazard.
  // The "high risk" count still flags individual High/Very High hazards.
  const overallScore = a.hazards.length
    ? Math.round(scoreSum / a.hazards.length)
    : 0;

  return {
    hazardCount: a.hazards.length,
    overallScore,
    headlineBand: a.hazards.length ? riskBand(overallScore) : null,
    highRiskCount,
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
  assignedToUserId?: string;
}

const listSelect = {
  center: { select: { name: true } },
  area: { select: { name: true } },
  role: { select: { name: true } },
  activity: { select: { name: true } },
  hazards: {
    select: {
      likelihood: true,
      severity: true,
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
  if (filters.assignedToUserId)
    where.assignees = { some: { id: filters.assignedToUserId } };
  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { reference: { contains: q } },
      { description: { contains: q } },
      { area: { name: { contains: q } } },
      { role: { name: { contains: q } } },
      { activity: { name: { contains: q } } },
      { hazards: { some: { hazard: { contains: q } } } },
    ];
  }

  const rows = await db.riskAssessment.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: listSelect,
  });

  const enriched = rows.map((r) => ({
    ...r,
    title: assessmentTitle(r),
    summary: summarizeAssessment(r),
  }));

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
      assignees: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, image: true },
      },
      reviewRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: { select: { name: true, email: true } },
          resolvedBy: { select: { name: true, email: true } },
        },
      },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
}

export type AssessmentDetail = NonNullable<
  Awaited<ReturnType<typeof getAssessmentDetail>>
>;

// Centres + their areas + org roles/activities, for the assessment form selects.
export async function getAssessmentFormData() {
  const [centers, roles, activities, users] = await Promise.all([
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
    db.user.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    }),
  ]);

  const areasByCenter: Record<string, { id: string; name: string }[]> = {};
  for (const c of centers) areasByCenter[c.id] = c.areas;

  return {
    centers: centers.map((c) => ({ id: c.id, name: c.name })),
    areasByCenter,
    roles,
    activities,
    users,
  };
}

function deriveSiteCode(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "");
  return (letters.slice(0, 2) || "XX").toUpperCase();
}

// Next reference for a centre: RA-{SITECODE}-{NNNN}, numbered per site.
export async function nextReference(centerId: string): Promise<string> {
  const center = await db.center.findUnique({
    where: { id: centerId },
    select: { siteCode: true, name: true },
  });
  const code = (
    center?.siteCode || deriveSiteCode(center?.name ?? "")
  ).toUpperCase();
  const prefix = `RA-${code}-`;
  const rows = await db.riskAssessment.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = r.reference.slice(prefix.length).match(/^(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
