import { cache } from "react";
import { startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  ActionListItem,
  AreaOption,
  IncidentDetail,
  IncidentListItem,
  TriageQueueItem,
  UserOption,
} from "@/lib/incidents/types";
import { AWAITING_TRIAGE_STATUS } from "@/lib/incidents/constants";

// ─── Overdue sweep ──────────────────────────────────────────────────────────
// Storing an "Overdue" status lets us query/aggregate efficiently; we refresh it
// on read. Any Open/InProgress action past its due date becomes Overdue.

export async function sweepOverdueActions(centerId?: string | null): Promise<void> {
  const today = startOfDay(new Date());
  await db.followUpAction.updateMany({
    where: {
      status: { in: ["Open", "InProgress"] },
      dueDate: { lt: today },
      ...(centerId ? { incident: { centerId } } : {}),
    },
    data: { status: "Overdue" },
  });
}

// ─── List ───────────────────────────────────────────────────────────────────

const listInclude = {
  center: { select: { id: true, name: true, siteCode: true } },
  _count: { select: { injuredParties: true, witnesses: true } },
  followUpActions: { select: { status: true } },
} satisfies Prisma.IncidentInclude;

type IncidentWithList = Prisma.IncidentGetPayload<{ include: typeof listInclude }>;

function toListItem(incident: IncidentWithList): IncidentListItem {
  const totalActionCount = incident.followUpActions.length;
  const openActionCount = incident.followUpActions.filter(
    (a) => a.status !== "Complete",
  ).length;

  return {
    id: incident.id,
    reference: incident.reference,
    type: incident.type,
    severity: incident.severity,
    status: incident.status,
    location: incident.location,
    locationDetail: incident.locationDetail,
    occurredAt: incident.occurredAt,
    reportedBy: incident.reportedBy,
    centerId: incident.centerId,
    centerName: incident.center.name,
    centerSiteCode: incident.center.siteCode,
    injuredCount: incident._count.injuredParties,
    witnessCount: incident._count.witnesses,
    openActionCount,
    totalActionCount,
  };
}

export async function listIncidents(options?: {
  centerId?: string | null;
  statuses?: string[];
}): Promise<IncidentListItem[]> {
  await sweepOverdueActions(options?.centerId);

  const incidents = await db.incident.findMany({
    where: {
      ...(options?.centerId ? { centerId: options.centerId } : {}),
      ...(options?.statuses ? { status: { in: options.statuses } } : {}),
    },
    include: listInclude,
    orderBy: { occurredAt: "desc" },
  });

  return incidents.map(toListItem);
}

// ─── Triage queue (awaiting-triage reports, oldest-waiting first) ───────────

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 36e5);
}

export async function listAwaitingTriage(
  centerId?: string | null,
): Promise<TriageQueueItem[]> {
  const incidents = await db.incident.findMany({
    where: {
      status: AWAITING_TRIAGE_STATUS,
      ...(centerId ? { centerId } : {}),
    },
    select: {
      id: true,
      reference: true,
      type: true,
      severity: true,
      location: true,
      locationDetail: true,
      occurredAt: true,
      reportedAt: true,
      createdAt: true,
      reportedBy: true,
      center: { select: { name: true, siteCode: true } },
    },
    orderBy: [{ reportedAt: "asc" }, { createdAt: "asc" }],
  });

  return incidents.map((inc) => {
    const waitingSince = inc.reportedAt ?? inc.createdAt;
    return {
      id: inc.id,
      reference: inc.reference,
      type: inc.type,
      severity: inc.severity,
      location: inc.location,
      locationDetail: inc.locationDetail,
      occurredAt: inc.occurredAt,
      reportedAt: inc.reportedAt,
      waitingSince,
      reportGapHours: inc.reportedAt ? hoursBetween(inc.occurredAt, inc.reportedAt) : null,
      reportedBy: inc.reportedBy,
      centerName: inc.center.name,
      centerSiteCode: inc.center.siteCode,
    };
  });
}

// ─── Detail ─────────────────────────────────────────────────────────────────
// Cached per request so the page and its generateMetadata share one fetch.

export const getIncidentDetail = cache(
  async (id: string): Promise<IncidentDetail | null> => {
    const today = startOfDay(new Date());
    await db.followUpAction.updateMany({
      where: {
        incidentId: id,
        status: { in: ["Open", "InProgress"] },
        dueDate: { lt: today },
      },
      data: { status: "Overdue" },
    });

    return db.incident.findUnique({
      where: { id },
      include: {
        center: true,
        witnesses: { orderBy: { createdAt: "asc" } },
        injuredParties: { orderBy: { createdAt: "asc" } },
        followUpActions: { orderBy: { dueDate: "asc" } },
      },
    });
  },
);

// ─── Cross-incident follow-up actions (actions overview) ────────────────────

const actionInclude = {
  incident: {
    select: {
      id: true,
      reference: true,
      location: true,
      centerId: true,
      center: { select: { name: true } },
    },
  },
} satisfies Prisma.FollowUpActionInclude;

type ActionWithIncident = Prisma.FollowUpActionGetPayload<{
  include: typeof actionInclude;
}>;

function toActionListItem(a: ActionWithIncident): ActionListItem {
  return {
    id: a.id,
    description: a.description,
    assignedTo: a.assignedTo,
    dueDate: a.dueDate,
    status: a.status,
    completedAt: a.completedAt,
    completedBy: a.completedBy,
    notes: a.notes,
    incidentId: a.incident.id,
    incidentRef: a.incident.reference,
    incidentLocation: a.incident.location,
    centerId: a.incident.centerId,
    centerName: a.incident.center.name,
  };
}

export async function listFollowUpActions(options?: {
  centerId?: string | null;
}): Promise<ActionListItem[]> {
  await sweepOverdueActions(options?.centerId);

  const actions = await db.followUpAction.findMany({
    where: options?.centerId ? { incident: { centerId: options.centerId } } : {},
    include: actionInclude,
    orderBy: [{ dueDate: "asc" }],
  });

  return actions.map(toActionListItem);
}

// Open follow-up actions assigned to a person (by name) — the For You inbox.
export async function getActionsAssignedTo(
  assignee: string,
  centerId?: string | null,
): Promise<ActionListItem[]> {
  await sweepOverdueActions(centerId);

  const actions = await db.followUpAction.findMany({
    where: {
      assignedTo: assignee,
      status: { not: "Complete" },
      ...(centerId ? { incident: { centerId } } : {}),
    },
    include: actionInclude,
    orderBy: [{ dueDate: "asc" }],
  });

  return actions.map(toActionListItem);
}

// Draft incidents a user reported but hasn't submitted yet — the For You inbox.
export async function getMyIncidentDrafts(
  userId: string,
  centerId?: string | null,
): Promise<IncidentListItem[]> {
  const incidents = await db.incident.findMany({
    where: {
      reportedById: userId,
      status: "Draft",
      ...(centerId ? { centerId } : {}),
    },
    include: listInclude,
    orderBy: { occurredAt: "desc" },
  });
  return incidents.map(toListItem);
}

// ─── Location options for the incident form's cascading pickers ─────────────

export const getAreaOptions = cache(
  async (centerId?: string | null): Promise<AreaOption[]> => {
    const areas = await db.area.findMany({
      where: centerId ? { centerId } : {},
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        centerId: true,
        name: true,
        subAreas: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    });
    return areas;
  },
);

// ─── Locations admin (areas + their sub-areas, with incident usage) ─────────

export type AdminAreaLocation = {
  id: string;
  name: string;
  subAreas: {
    id: string;
    name: string;
    description: string | null;
    incidentCount: number;
  }[];
};

export async function listAreasWithSubAreas(
  centerId?: string | null,
): Promise<AdminAreaLocation[]> {
  const areas = await db.area.findMany({
    where: centerId ? { centerId } : {},
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      subAreas: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { incidents: true } },
        },
      },
    },
  });
  return areas.map((a) => ({
    id: a.id,
    name: a.name,
    subAreas: a.subAreas.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      incidentCount: s._count.incidents,
    })),
  }));
}

// Active users, for the admin-only "report on behalf of" picker.
export async function getReporterOptions(): Promise<UserOption[]> {
  const users = await db.user.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, email: true },
  });
  return users.map((u) => ({ id: u.id, name: u.name ?? u.email }));
}
