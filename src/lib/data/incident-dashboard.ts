import { differenceInCalendarDays, format, startOfDay, startOfMonth, subMonths } from "date-fns";
import { db } from "@/lib/db";
import { sweepOverdueActions } from "@/lib/data/incidents";
import {
  INACTIVE_INCIDENT_STATUSES,
  INCIDENT_SEVERITIES,
  INCIDENT_TYPE_META,
  INCIDENT_TYPES,
} from "@/lib/incidents/constants";

const INACTIVE: readonly string[] = INACTIVE_INCIDENT_STATUSES;
import type {
  AttentionAction,
  AttentionIncident,
  DistributionItem,
  IncidentDashboardData,
  IncidentListItem,
} from "@/lib/incidents/types";

const REPORTABLE_SEVERITIES = ["Reportable", "Critical"];

// One snapshot for the incidents dashboard. Plain async (no caching), scoped to
// the selected centre (null = all centres) — mirrors src/lib/data/monitoring.ts.
// Drafts are excluded: an unsubmitted report isn't a live incident.
export async function getIncidentDashboard(
  centerId: string | null,
): Promise<IncidentDashboardData> {
  await sweepOverdueActions(centerId);

  const scope = centerId ? { centerId } : {};

  const incidents = await db.incident.findMany({
    where: { ...scope, status: { not: "Draft" } },
    select: {
      id: true,
      reference: true,
      type: true,
      severity: true,
      status: true,
      location: true,
      locationDetail: true,
      occurredAt: true,
      reportedAt: true,
      createdAt: true,
      reportedBy: true,
      centerId: true,
      injuredCount: true,
      witnessCount: true,
      center: { select: { name: true, siteCode: true } },
      followUpActions: { select: { status: true } },
    },
    orderBy: { occurredAt: "desc" },
  });

  // Status / severity tallies (seeded so every band shows, even at zero).
  const statusCounts: Record<string, number> = {
    Open: 0,
    UnderInvestigation: 0,
    Closed: 0,
    Imported: 0,
  };
  const severityCounts: Record<string, number> = Object.fromEntries(
    INCIDENT_SEVERITIES.map((s) => [s.value, 0]),
  );
  const typeTally: Record<string, number> = {};
  const locationTally: Record<string, number> = {};

  let injured = 0;
  let open = 0;
  let reportableOpenCount = 0;

  for (const inc of incidents) {
    statusCounts[inc.status] = (statusCounts[inc.status] ?? 0) + 1;
    severityCounts[inc.severity] = (severityCounts[inc.severity] ?? 0) + 1;
    typeTally[inc.type] = (typeTally[inc.type] ?? 0) + 1;
    locationTally[inc.location] = (locationTally[inc.location] ?? 0) + 1;
    injured += inc.injuredCount;
    if (inc.status === "Open" || inc.status === "UnderInvestigation") open += 1;
    if (REPORTABLE_SEVERITIES.includes(inc.severity) && !INACTIVE.includes(inc.status)) {
      reportableOpenCount += 1;
    }
  }

  const typeCounts: DistributionItem[] = INCIDENT_TYPES.map((t) => ({
    label: INCIDENT_TYPE_META[t.value]?.label ?? t.value,
    value: t.value,
    count: typeTally[t.value] ?? 0,
  }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const locationCounts: DistributionItem[] = Object.entries(locationTally)
    .map(([label, count]) => ({ label, value: label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Activity — incidents per month for the last 6 months.
  const now = new Date();
  const activity = Array.from({ length: 6 }).map((_, i) => {
    const month = startOfMonth(subMonths(now, 5 - i));
    const next = startOfMonth(subMonths(now, 4 - i));
    const count = incidents.filter(
      (inc) => inc.occurredAt >= month && inc.occurredAt < next,
    ).length;
    return { month: format(month, "MMM"), count };
  });

  // Overdue follow-up actions (full feed for the count, top 6 for the panel).
  const today = startOfDay(now);
  const overdueRows = await db.followUpAction.findMany({
    where: {
      status: "Overdue",
      ...(centerId ? { incident: { centerId } } : {}),
    },
    include: { incident: { select: { id: true, reference: true } } },
    orderBy: { dueDate: "asc" },
  });
  const overdueActions: AttentionAction[] = overdueRows.slice(0, 6).map((a) => ({
    incidentId: a.incident.id,
    reference: a.incident.reference,
    description: a.description,
    assignedTo: a.assignedTo,
    dueDate: a.dueDate,
    daysOverdue: Math.max(0, differenceInCalendarDays(today, startOfDay(a.dueDate))),
  }));

  // Reportable/critical incidents still open.
  const reportableOpen: AttentionIncident[] = incidents
    .filter(
      (inc) => REPORTABLE_SEVERITIES.includes(inc.severity) && !INACTIVE.includes(inc.status),
    )
    .slice(0, 6)
    .map((inc) => ({
      id: inc.id,
      reference: inc.reference,
      severity: inc.severity,
      location: inc.locationDetail
        ? `${inc.location} — ${inc.locationDetail}`
        : inc.location,
      occurredAt: inc.occurredAt,
      openActions: inc.followUpActions.filter((a) => a.status !== "Complete").length,
    }));

  const recent: IncidentListItem[] = incidents.slice(0, 5).map((inc) => ({
    id: inc.id,
    reference: inc.reference,
    type: inc.type,
    severity: inc.severity,
    status: inc.status,
    location: inc.location,
    locationDetail: inc.locationDetail,
    occurredAt: inc.occurredAt,
    reportedBy: inc.reportedBy,
    centerId: inc.centerId,
    centerName: inc.center.name,
    centerSiteCode: inc.center.siteCode,
    injuredCount: inc.injuredCount,
    witnessCount: inc.witnessCount,
    openActionCount: inc.followUpActions.filter((a) => a.status !== "Complete").length,
    totalActionCount: inc.followUpActions.length,
  }));

  return {
    total: incidents.length,
    stats: {
      total: incidents.length,
      open,
      overdueActions: overdueRows.length,
      reportableOpen: reportableOpenCount,
      injured,
    },
    statusCounts,
    severityCounts,
    typeCounts,
    locationCounts,
    activity,
    overdueActions,
    overdueActionsTotal: overdueRows.length,
    reportableOpen,
    reportableOpenTotal: reportableOpenCount,
    recent,
  };
}
