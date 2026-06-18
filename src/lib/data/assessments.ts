import { db } from "@/lib/db";
import { riskBand, riskScore, isHighRisk, type RiskBand } from "@/lib/risk";
import { reviewStatusFor, type ReviewStatus } from "@/lib/utils";

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
  status: string;
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
    review: reviewStatusFor(a),
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
  ownedByUserId?: string;
}

const listSelect = {
  center: { select: { name: true } },
  area: { select: { name: true } },
  role: { select: { name: true } },
  activity: { select: { name: true } },
  owner: { select: { id: true, name: true, email: true } },
  department: { select: { id: true, name: true } },
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
  if (filters.ownedByUserId) where.ownerId = filters.ownedByUserId;
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

export type SearchHit = AssessmentRow & { headline: string };

// Full-text search across an assessment AND all of its hazards' content
// (hazard, risk factor, person at risk, consequence, controls, category) plus
// reference / scope / subject. Ranked by relevance, with a highlighted snippet
// showing where it matched. The searchable document is built from joins at
// query time, so there is nothing to keep in sync.
export async function searchAssessments(
  query: string,
  centerId: string | null,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const hits = await db.$queryRaw<
    { id: string; rank: number; headline: string }[]
  >`
    WITH docs AS (
      SELECT
        ra."id",
        ra."updatedAt",
        ra."centerId",
        concat_ws(' ',
          ra."reference", ra."description", ra."assessorName",
          ar."name", ro."name", ac."name", hz."htext"
        ) AS doc
      FROM "RiskAssessment" ra
      LEFT JOIN "Area" ar ON ra."areaId" = ar."id"
      LEFT JOIN "Role" ro ON ra."roleId" = ro."id"
      LEFT JOIN "Activity" ac ON ra."activityId" = ac."id"
      LEFT JOIN LATERAL (
        SELECT string_agg(
          concat_ws(' ', h."hazard", h."riskFactor", h."personAtRisk",
                    h."consequence", h."currentControls", h."riskCategory"),
          ' '
        ) AS htext
        FROM "Hazard" h WHERE h."assessmentId" = ra."id"
      ) hz ON TRUE
    )
    SELECT
      "id",
      ts_rank(to_tsvector('english', doc), websearch_to_tsquery('english', ${q})) AS rank,
      ts_headline('english', doc, websearch_to_tsquery('english', ${q}),
        'StartSel=[[hl]], StopSel=[[/hl]], MaxFragments=2, MinWords=3, MaxWords=12, FragmentDelimiter= … ') AS headline
    FROM docs
    WHERE to_tsvector('english', doc) @@ websearch_to_tsquery('english', ${q})
      AND (${centerId}::text IS NULL OR "centerId" = ${centerId})
    ORDER BY rank DESC, "updatedAt" DESC
    LIMIT 50
  `;
  if (hits.length === 0) return [];

  // Reuse the enriched rows (risk summary, title, centre scope), keep rank order.
  const rows = await listAssessments({ centerId });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return hits
    .map((h) => {
      const row = byId.get(h.id);
      return row ? { ...row, headline: h.headline } : null;
    })
    .filter((r): r is SearchHit => r !== null);
}

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
      owner: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
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
  const [centers, roles, activities, departments, users, assessedAreas] =
    await Promise.all([
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
      db.department.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      db.user.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true },
      }),
      // Areas that already have an assessment — one assessment per area.
      db.riskAssessment.findMany({
        where: { areaId: { not: null } },
        select: { areaId: true },
        distinct: ["areaId"],
      }),
    ]);

  const areasByCenter: Record<string, { id: string; name: string }[]> = {};
  for (const c of centers) areasByCenter[c.id] = c.areas;

  const assessedAreaIds = assessedAreas
    .map((r) => r.areaId)
    .filter((id): id is string => Boolean(id));

  return {
    centers: centers.map((c) => ({ id: c.id, name: c.name })),
    areasByCenter,
    roles,
    activities,
    departments,
    users,
    assessedAreaIds,
  };
}

// Areas are 1:1 with assessments — find the assessment (if any) already
// covering an area, optionally excluding one (used when editing).
export async function findAreaAssessment(areaId: string, excludeId?: string) {
  return db.riskAssessment.findFirst({
    where: { areaId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, reference: true },
  });
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
