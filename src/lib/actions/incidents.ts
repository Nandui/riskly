"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, can, denyUnless, type CurrentUser } from "@/lib/auth";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { generateIncidentReference } from "@/lib/incidents/reference";
import {
  addFollowUpActionSchema,
  addInjuredPartySchema,
  addWitnessSchema,
  closeIncidentSchema,
  incidentDraftSchema,
  incidentFullSchema,
  incidentUpdateSchema,
  setActionStatusSchema,
  updateFollowUpActionSchema,
  updateInjuredPartySchema,
  updateWitnessSchema,
} from "@/lib/incidents/validation";

const MAX_REFERENCE_RETRIES = 5;

function revalidateIncidents(id?: string) {
  revalidatePath("/incidents");
  revalidatePath("/incidents/list");
  revalidatePath("/incidents/actions");
  if (id) revalidatePath(`/incidents/${id}`);
}

function parseJsonArray(formData: FormData, key: string): unknown {
  const raw = formData.get(key);
  if (typeof raw === "string" && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function invalidForm(
  err: Parameters<typeof fieldErrorsFromZod>[0],
): FormState {
  return {
    ok: false,
    error: "Please fix the highlighted fields.",
    fieldErrors: fieldErrorsFromZod(err),
  };
}

// Validate that the chosen area/sub-area belong to the centre, returning the
// denormalised location names to store on the incident.
async function resolveLocation(
  centerId: string,
  areaId: string,
  subAreaId: string | undefined,
): Promise<
  | { ok: true; location: string; locationDetail: string | null; subAreaId: string | null }
  | { ok: false; error: string }
> {
  const area = await db.area.findFirst({
    where: { id: areaId, centerId },
    select: { name: true },
  });
  if (!area) return { ok: false, error: "Select a valid location for this centre." };

  if (!subAreaId) {
    return { ok: true, location: area.name, locationDetail: null, subAreaId: null };
  }
  const sub = await db.subArea.findFirst({
    where: { id: subAreaId, areaId },
    select: { name: true },
  });
  if (!sub) return { ok: false, error: "Select a valid sub-location for this area." };
  return { ok: true, location: area.name, locationDetail: sub.name, subAreaId };
}

// Everyone is recorded as themselves; only admins may attribute a report to
// another user (enforced server-side, not just in the form).
async function resolveReporter(
  current: CurrentUser,
  requestedId: string | null | undefined,
): Promise<
  | { ok: true; reportedBy: string; reportedById: string }
  | { ok: false; error: string }
> {
  const currentName = current.name ?? current.email ?? "Unknown";
  if (!can(current, "admin") || !requestedId || requestedId === current.id) {
    return { ok: true, reportedBy: currentName, reportedById: current.id };
  }
  const reporter = await db.user.findUnique({
    where: { id: requestedId },
    select: { id: true, name: true, email: true },
  });
  if (!reporter) return { ok: false, error: "Select a valid reporter." };
  return {
    ok: true,
    reportedBy: reporter.name ?? reporter.email,
    reportedById: reporter.id,
  };
}

type WitnessCreate = {
  name: string;
  roleOrRelation: string;
  contactPhone: string | null;
  contactEmail: string | null;
  statement: string;
  statementDate: Date;
};
type InjuredCreate = {
  partyType: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  injuryNature: string;
  bodyPartAffected: string;
  treatment: string;
  hospitalName: string | null;
  gpReferral: boolean;
  lostTime: boolean;
  lostTimeDays: number | null;
  additionalNotes: string | null;
};
type FollowUpCreate = {
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: string;
};

function mapWitness(w: {
  name: string;
  roleOrRelation: string;
  contactPhone?: string;
  contactEmail?: string;
  statement: string;
  statementDate: string;
}): WitnessCreate {
  return {
    name: w.name,
    roleOrRelation: w.roleOrRelation,
    contactPhone: w.contactPhone || null,
    contactEmail: w.contactEmail || null,
    statement: w.statement,
    statementDate: new Date(w.statementDate),
  };
}

function mapInjured(p: {
  partyType: string;
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  injuryNature: string;
  bodyPartAffected: string;
  treatment: string;
  hospitalName?: string;
  lostTime: boolean;
  lostTimeDays?: number;
  additionalNotes?: string;
}): InjuredCreate {
  return {
    partyType: p.partyType,
    name: p.name,
    contactPhone: p.contactPhone || null,
    contactEmail: p.contactEmail || null,
    injuryNature: p.injuryNature,
    bodyPartAffected: p.bodyPartAffected,
    treatment: p.treatment,
    hospitalName: p.hospitalName || null,
    gpReferral: p.treatment === "GpReferral",
    lostTime: p.lostTime,
    lostTimeDays: p.lostTime ? (p.lostTimeDays ?? null) : null,
    additionalNotes: p.additionalNotes || null,
  };
}

function mapFollowUp(a: {
  description: string;
  assignedTo: string;
  dueDate: string;
}): FollowUpCreate {
  return {
    description: a.description,
    assignedTo: a.assignedTo,
    dueDate: new Date(a.dueDate),
    status: "Open",
  };
}

// ─── Create (report) ────────────────────────────────────────────────────────

export async function createIncident(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user, "requestReview")) {
    return { ok: false, error: "You don't have permission to report incidents." };
  }

  const isDraft = String(formData.get("intent") ?? "submit") === "draft";
  const payload = {
    centerId: formData.get("centerId"),
    type: formData.get("type"),
    severity: formData.get("severity"),
    occurredAt: formData.get("occurredAt"),
    areaId: formData.get("areaId"),
    subAreaId: formData.get("subAreaId") ?? "",
    description: formData.get("description") ?? "",
    immediateAction: formData.get("immediateAction") ?? undefined,
    reportedById: formData.get("reportedById") ?? undefined,
    witnesses: parseJsonArray(formData, "witnesses"),
    injuredParties: parseJsonArray(formData, "injuredParties"),
    followUpActions: parseJsonArray(formData, "followUpActions"),
  };

  const parsed = (isDraft ? incidentDraftSchema : incidentFullSchema).safeParse(payload);
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const d = parsed.data;

  const loc = await resolveLocation(d.centerId, d.areaId, d.subAreaId);
  if (!loc.ok) return { ok: false, error: loc.error };

  const reporter = await resolveReporter(user!, d.reportedById);
  if (!reporter.ok) return { ok: false, error: reporter.error };

  let createdId: string | null = null;
  for (let attempt = 0; attempt < MAX_REFERENCE_RETRIES; attempt++) {
    try {
      const incident = await db.$transaction(async (tx) => {
        const reference = await generateIncidentReference(d.centerId, tx);
        return tx.incident.create({
          data: {
            centerId: d.centerId,
            reference,
            type: d.type,
            status: isDraft ? "Draft" : "Open",
            severity: d.severity,
            occurredAt: new Date(d.occurredAt),
            areaId: d.areaId,
            subAreaId: loc.subAreaId,
            location: loc.location,
            locationDetail: loc.locationDetail,
            description: d.description,
            immediateAction: d.immediateAction || null,
            reportedBy: reporter.reportedBy,
            reportedById: reporter.reportedById,
            witnessCount: d.witnesses.length,
            injuredCount: d.injuredParties.length,
            witnesses: { create: d.witnesses.map(mapWitness) },
            injuredParties: { create: d.injuredParties.map(mapInjured) },
            followUpActions: { create: d.followUpActions.map(mapFollowUp) },
          },
          select: { id: true },
        });
      });
      createdId = incident.id;
      break;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < MAX_REFERENCE_RETRIES - 1
      ) {
        continue; // reference collided under concurrency — recompute and retry
      }
      console.error("createIncident failed", error);
      return { ok: false, error: "Could not save the incident. Please try again." };
    }
  }

  if (!createdId) {
    return { ok: false, error: "Could not generate a unique reference. Please try again." };
  }

  revalidateIncidents();
  redirect(`/incidents/${createdId}`);
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateIncident(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user, "requestReview")) {
    return { ok: false, error: "You don't have permission to edit incidents." };
  }

  const payload = {
    id: formData.get("id"),
    centerId: formData.get("centerId"),
    type: formData.get("type"),
    severity: formData.get("severity"),
    occurredAt: formData.get("occurredAt"),
    areaId: formData.get("areaId"),
    subAreaId: formData.get("subAreaId") ?? "",
    description: formData.get("description") ?? "",
    immediateAction: formData.get("immediateAction") ?? undefined,
    reportedById: formData.get("reportedById") ?? undefined,
  };

  const parsed = incidentUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const d = parsed.data;

  const existing = await db.incident.findUnique({
    where: { id: d.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Incident not found." };

  const loc = await resolveLocation(d.centerId, d.areaId, d.subAreaId);
  if (!loc.ok) return { ok: false, error: loc.error };

  // Only admins may reassign the reporter; a blank value leaves it unchanged.
  let reporterUpdate: { reportedBy: string; reportedById: string } | undefined;
  if (can(user, "admin") && d.reportedById) {
    const reporter = await resolveReporter(user!, d.reportedById);
    if (!reporter.ok) return { ok: false, error: reporter.error };
    reporterUpdate = {
      reportedBy: reporter.reportedBy,
      reportedById: reporter.reportedById,
    };
  }

  try {
    await db.incident.update({
      where: { id: d.id },
      data: {
        centerId: d.centerId,
        type: d.type,
        severity: d.severity,
        occurredAt: new Date(d.occurredAt),
        areaId: d.areaId,
        subAreaId: loc.subAreaId,
        location: loc.location,
        locationDetail: loc.locationDetail,
        description: d.description,
        immediateAction: d.immediateAction || null,
        ...(reporterUpdate ?? {}),
      },
    });
  } catch (error) {
    console.error("updateIncident failed", error);
    return { ok: false, error: "Could not update the incident." };
  }

  revalidateIncidents(d.id);
  redirect(`/incidents/${d.id}`);
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

export async function submitDraft(incidentId: string): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, status: true, description: true, location: true },
  });
  if (!incident) return { ok: false, error: "Incident not found." };
  if (incident.status !== "Draft") {
    return { ok: false, error: "This incident has already been submitted." };
  }
  if (!incident.description || incident.description.trim().length < 10) {
    return { ok: false, error: "Add a fuller description (at least 10 characters) before submitting." };
  }
  if (!incident.location.trim()) {
    return { ok: false, error: "A location is required before submitting." };
  }

  await db.incident.update({ where: { id: incidentId }, data: { status: "Open" } });
  revalidateIncidents(incidentId);
  return { ok: true };
}

export async function setIncidentStatus(
  incidentId: string,
  status: "Open" | "UnderInvestigation",
): Promise<FormState> {
  const denied = await denyUnless("review");
  if (denied) return denied;

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: { status: true },
  });
  if (!incident) return { ok: false, error: "Incident not found." };
  if (incident.status === "Draft") {
    return { ok: false, error: "Submit the report before changing its status." };
  }
  if (incident.status === "Closed") {
    return { ok: false, error: "This incident is closed. Re-open it to make changes." };
  }

  await db.incident.update({ where: { id: incidentId }, data: { status } });
  revalidateIncidents(incidentId);
  return { ok: true };
}

export async function closeIncident(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("review");
  if (denied) return denied;

  const parsed = closeIncidentSchema.safeParse({
    incidentId: formData.get("incidentId"),
    closureNotes: formData.get("closureNotes"),
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const d = parsed.data;

  const user = await getCurrentUser();
  const incident = await db.incident.findUnique({
    where: { id: d.incidentId },
    select: { status: true, followUpActions: { select: { status: true } } },
  });
  if (!incident) return { ok: false, error: "Incident not found." };
  if (incident.status !== "Open" && incident.status !== "UnderInvestigation") {
    return { ok: false, error: "Only open or under-investigation incidents can be closed." };
  }
  if (incident.followUpActions.some((a) => a.status !== "Complete")) {
    return { ok: false, error: "All follow-up actions must be complete before closing." };
  }

  await db.incident.update({
    where: { id: d.incidentId },
    data: {
      status: "Closed",
      closedAt: new Date(),
      closedBy: user?.name ?? user?.email ?? null,
      closureNotes: d.closureNotes,
    },
  });
  revalidateIncidents(d.incidentId);
  return { ok: true };
}

export async function reopenIncident(incidentId: string): Promise<FormState> {
  const denied = await denyUnless("review");
  if (denied) return denied;

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: { status: true },
  });
  if (!incident) return { ok: false, error: "Incident not found." };
  if (incident.status !== "Closed") {
    return { ok: false, error: "Only closed incidents can be re-opened." };
  }

  await db.incident.update({
    where: { id: incidentId },
    data: { status: "UnderInvestigation", closedAt: null, closedBy: null, closureNotes: null },
  });
  revalidateIncidents(incidentId);
  return { ok: true };
}

export async function deleteIncident(incidentId: string): Promise<FormState> {
  const denied = await denyUnless("admin");
  if (denied) return denied;

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true },
  });
  if (!incident) return { ok: false, error: "Incident not found." };

  try {
    // Witnesses, injured parties and follow-up actions cascade on delete.
    await db.incident.delete({ where: { id: incidentId } });
  } catch (error) {
    console.error("deleteIncident failed", error);
    return { ok: false, error: "Could not delete the incident." };
  }

  revalidateIncidents();
  redirect("/incidents/list");
}

// ─── Witnesses ──────────────────────────────────────────────────────────────

async function refreshWitnessCount(incidentId: string) {
  const witnessCount = await db.witness.count({ where: { incidentId } });
  await db.incident.update({ where: { id: incidentId }, data: { witnessCount } });
}

export async function addWitness(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const parsed = addWitnessSchema.safeParse({
    incidentId: formData.get("incidentId"),
    name: formData.get("name"),
    roleOrRelation: formData.get("roleOrRelation"),
    contactPhone: formData.get("contactPhone") ?? undefined,
    contactEmail: formData.get("contactEmail") ?? undefined,
    statement: formData.get("statement"),
    statementDate: formData.get("statementDate"),
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const { incidentId, ...w } = parsed.data;

  await db.witness.create({ data: { incidentId, ...mapWitness(w) } });
  await refreshWitnessCount(incidentId);
  revalidateIncidents(incidentId);
  return { ok: true };
}

export async function updateWitness(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const parsed = updateWitnessSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    roleOrRelation: formData.get("roleOrRelation"),
    contactPhone: formData.get("contactPhone") ?? undefined,
    contactEmail: formData.get("contactEmail") ?? undefined,
    statement: formData.get("statement"),
    statementDate: formData.get("statementDate"),
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const { id, ...w } = parsed.data;
  const existing = await db.witness.findUnique({ where: { id }, select: { incidentId: true } });
  if (!existing) return { ok: false, error: "Witness not found." };

  await db.witness.update({ where: { id }, data: mapWitness(w) });
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

export async function deleteWitness(id: string): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const existing = await db.witness.findUnique({ where: { id }, select: { incidentId: true } });
  if (!existing) return { ok: false, error: "Witness not found." };

  await db.witness.delete({ where: { id } });
  await refreshWitnessCount(existing.incidentId);
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

// ─── Injured parties ────────────────────────────────────────────────────────

async function refreshInjuredCount(incidentId: string) {
  const injuredCount = await db.injuredParty.count({ where: { incidentId } });
  await db.incident.update({ where: { id: incidentId }, data: { injuredCount } });
}

function injuredFormPayload(formData: FormData) {
  return {
    partyType: formData.get("partyType"),
    name: formData.get("name"),
    contactPhone: formData.get("contactPhone") ?? undefined,
    contactEmail: formData.get("contactEmail") ?? undefined,
    injuryNature: formData.get("injuryNature"),
    bodyPartAffected: formData.get("bodyPartAffected"),
    treatment: formData.get("treatment"),
    hospitalName: formData.get("hospitalName") ?? undefined,
    lostTime: formData.get("lostTime") === "on" || formData.get("lostTime") === "true",
    lostTimeDays: emptyToNull(formData.get("lostTimeDays")) ?? undefined,
    additionalNotes: formData.get("additionalNotes") ?? undefined,
  };
}

export async function addInjuredParty(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const parsed = addInjuredPartySchema.safeParse({
    incidentId: formData.get("incidentId"),
    ...injuredFormPayload(formData),
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const { incidentId, ...p } = parsed.data;

  await db.injuredParty.create({ data: { incidentId, ...mapInjured(p) } });
  await refreshInjuredCount(incidentId);
  revalidateIncidents(incidentId);
  return { ok: true };
}

export async function updateInjuredParty(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const parsed = updateInjuredPartySchema.safeParse({
    id: formData.get("id"),
    ...injuredFormPayload(formData),
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const { id, ...p } = parsed.data;
  const existing = await db.injuredParty.findUnique({ where: { id }, select: { incidentId: true } });
  if (!existing) return { ok: false, error: "Injured party not found." };

  await db.injuredParty.update({ where: { id }, data: mapInjured(p) });
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

export async function deleteInjuredParty(id: string): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const existing = await db.injuredParty.findUnique({ where: { id }, select: { incidentId: true } });
  if (!existing) return { ok: false, error: "Injured party not found." };

  await db.injuredParty.delete({ where: { id } });
  await refreshInjuredCount(existing.incidentId);
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

// ─── Follow-up actions ──────────────────────────────────────────────────────

export async function addFollowUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const parsed = addFollowUpActionSchema.safeParse({
    incidentId: formData.get("incidentId"),
    description: formData.get("description"),
    assignedTo: formData.get("assignedTo"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const { incidentId, ...a } = parsed.data;

  await db.followUpAction.create({ data: { incidentId, ...mapFollowUp(a) } });
  revalidateIncidents(incidentId);
  return { ok: true };
}

export async function updateFollowUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const parsed = updateFollowUpActionSchema.safeParse({
    id: formData.get("id"),
    description: formData.get("description"),
    assignedTo: formData.get("assignedTo"),
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const d = parsed.data;
  const user = await getCurrentUser();
  const existing = await db.followUpAction.findUnique({
    where: { id: d.id },
    select: { incidentId: true },
  });
  if (!existing) return { ok: false, error: "Action not found." };

  const completed = d.status === "Complete";
  await db.followUpAction.update({
    where: { id: d.id },
    data: {
      description: d.description,
      assignedTo: d.assignedTo,
      dueDate: new Date(d.dueDate),
      status: d.status,
      notes: d.notes,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? (user?.name ?? user?.email ?? null) : null,
    },
  });
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

// Quick status toggle from a table row (e.g. "Mark complete").
export async function setActionStatus(
  id: string,
  status: "Open" | "InProgress" | "Complete" | "Overdue",
): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const parsed = setActionStatusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const user = await getCurrentUser();
  const existing = await db.followUpAction.findUnique({
    where: { id },
    select: { incidentId: true },
  });
  if (!existing) return { ok: false, error: "Action not found." };

  const completed = status === "Complete";
  await db.followUpAction.update({
    where: { id },
    data: {
      status,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? (user?.name ?? user?.email ?? null) : null,
    },
  });
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

export async function deleteFollowUpAction(id: string): Promise<FormState> {
  const denied = await denyUnless("requestReview");
  if (denied) return denied;

  const existing = await db.followUpAction.findUnique({
    where: { id },
    select: { incidentId: true },
  });
  if (!existing) return { ok: false, error: "Action not found." };

  await db.followUpAction.delete({ where: { id } });
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}
