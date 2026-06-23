"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, can, denyUnless, type CurrentUser } from "@/lib/auth";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { generateIncidentReference } from "@/lib/incidents/reference";
import { recordAudit } from "@/lib/audit";
import { findSubjectAssessment, nextReference } from "@/lib/data/assessments";
import { moduleFor, typeHasResponseBlock } from "@/lib/incidents/type-modules";
import { computeNextReviewDate } from "@/lib/utils";
import {
  addEvidenceRequestSchema,
  addFollowUpActionSchema,
  addInjuredPartySchema,
  addWitnessSchema,
  closeIncidentSchema,
  incidentDraftSchema,
  incidentFullSchema,
  incidentUpdateSchema,
  investigationFindingsSchema,
  investigationNotesSchema,
  setActionStatusSchema,
  setIncidentHazardsSchema,
  updateEvidenceRequestSchema,
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

// ─── Per-type module fields (Phase 2) ───────────────────────────────────────
// Read straight from the form. Only the selected type's module section renders,
// so fields for other types simply aren't posted (→ null). Checkbox unchecked
// also posts nothing (→ null = "not indicated").

function mStr(formData: FormData, k: string): string | null {
  const v = formData.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function mBool(formData: FormData, k: string): boolean | null {
  const v = formData.get(k);
  if (v == null) return null;
  return v === "on" || v === "true" || v === "yes";
}
function mInt(formData: FormData, k: string): number | null {
  const v = formData.get(k);
  if (typeof v !== "string" || !v.trim()) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function mFloat(formData: FormData, k: string): number | null {
  const v = formData.get(k);
  if (typeof v !== "string" || !v.trim()) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function mDate(formData: FormData, k: string): Date | null {
  const v = formData.get(k);
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
// Multi-select (several same-named checkboxes) -> comma-joined string, or null.
function mMulti(formData: FormData, k: string): string | null {
  const vals = formData.getAll(k).filter((v): v is string => typeof v === "string" && v.trim() !== "");
  return vals.length ? vals.join(",") : null;
}

function incidentModuleData(formData: FormData) {
  return {
    // Emergency response
    ambulanceCalled: mBool(formData, "ambulanceCalled"),
    aedUsed: mBool(formData, "aedUsed"),
    cprGiven: mBool(formData, "cprGiven"),
    firstAidBy: mStr(formData, "firstAidBy"),
    // Accident
    mechanism: mStr(formData, "mechanism"),
    // Aquatic
    aquaticRescueType: mStr(formData, "aquaticRescueType"),
    eapLevel: mStr(formData, "eapLevel"),
    lifeguardsOnDuty: mInt(formData, "lifeguardsOnDuty"),
    timeInDifficulty: mStr(formData, "timeInDifficulty"),
    spinalManagement: mBool(formData, "spinalManagement"),
    secondaryDrowningAdvice: mStr(formData, "secondaryDrowningAdvice"),
    // Medical
    presentingCondition: mStr(formData, "presentingCondition"),
    conscious: mStr(formData, "conscious"),
    breathing: mStr(formData, "breathing"),
    casualtyHandover: mStr(formData, "casualtyHandover"),
    // Facility / water
    afr: mBool(formData, "afr"),
    freeChlorine: mFloat(formData, "freeChlorine"),
    combinedChlorine: mFloat(formData, "combinedChlorine"),
    ph: mFloat(formData, "ph"),
    correctiveDosing: mStr(formData, "correctiveDosing"),
    closureStart: mDate(formData, "closureStart"),
    closureEnd: mDate(formData, "closureEnd"),
    samplesSent: mBool(formData, "samplesSent"),
    // Security
    crimeReference: mStr(formData, "crimeReference"),
    gardaiNotified: mBool(formData, "gardaiNotified"),
    ejection: mBool(formData, "ejection"),
    // Missing Child (Code Amber) — operational facts only
    locatedAt: mDate(formData, "locatedAt"),
    timeToLocateMins: mInt(formData, "timeToLocateMins"),
    missingChildSetting: mStr(formData, "missingChildSetting"),
    childAgeBand: mStr(formData, "childAgeBand"),
    lastSeenLocation: mStr(formData, "lastSeenLocation"),
    foundLocationClass: mStr(formData, "foundLocationClass"),
    proximityToWaterWhenFound: mStr(formData, "proximityToWaterWhenFound"),
    waterSearchInitiated: mBool(formData, "waterSearchInitiated"),
    poolsCleared: mStr(formData, "poolsCleared"),
    responseActions: mMulti(formData, "responseActions"),
    lockdownInitiated: mBool(formData, "lockdownInitiated"),
    emergencyServicesCalled: mBool(formData, "emergencyServicesCalled"),
    missingChildResolution: mStr(formData, "missingChildResolution"),
    policyReinforced: mBool(formData, "policyReinforced"),
  };
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

// Investigation work (actions + evidence/info requests) is assigned to a real,
// active app user. Resolves the posted id to the FK + a denormalised display
// name (stored so lists, the PDF and old rows render without a join).
async function resolveAssignee(
  userId: string,
): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  const u = await db.user.findFirst({
    where: { id: userId, isActive: true },
    select: { id: true, name: true, email: true },
  });
  if (!u) return { ok: false, error: "Assign this to a current user." };
  return { ok: true, id: u.id, name: u.name ?? u.email };
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
  memberId: string | null;
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
  statement?: string;
  statementDate?: string;
}): WitnessCreate {
  return {
    name: w.name,
    roleOrRelation: w.roleOrRelation,
    contactPhone: w.contactPhone || null,
    contactEmail: w.contactEmail || null,
    statement: w.statement ?? "",
    statementDate: w.statementDate ? new Date(w.statementDate) : new Date(),
  };
}

function mapInjured(p: {
  partyType: string;
  name: string;
  memberId?: string;
  contactPhone?: string;
  contactEmail?: string;
  injuryNature?: string;
  bodyPartAffected?: string;
  treatment: string;
  hospitalName?: string;
  lostTime: boolean;
  lostTimeDays?: number;
  additionalNotes?: string;
}): InjuredCreate {
  return {
    partyType: p.partyType,
    name: p.name,
    // Member number only applies to members.
    memberId: p.partyType === "Member" ? (p.memberId || null) : null,
    contactPhone: p.contactPhone || null,
    contactEmail: p.contactEmail || null,
    injuryNature: p.injuryNature ?? "",
    bodyPartAffected: p.bodyPartAffected ?? "",
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
  if (!can(user, "reportIncidents")) {
    return { ok: false, error: "You don't have permission to report incidents." };
  }

  const isDraft = String(formData.get("intent") ?? "submit") === "draft";
  // An admin can enter a historical record from a previous system — it is
  // marked "Imported" (kept out of the open / overdue metrics, but still feeds
  // the trend charts).
  const isImported =
    !isDraft && can(user, "admin") && String(formData.get("imported") ?? "") === "true";
  const payload = {
    centerId: formData.get("centerId"),
    type: formData.get("type"),
    severity: formData.get("severity"),
    occurredAt: formData.get("occurredAt"),
    reportedAt: formData.get("reportedAt") ?? undefined,
    areaId: formData.get("areaId"),
    subAreaId: formData.get("subAreaId") ?? "",
    description: formData.get("description") ?? "",
    immediateAction: formData.get("immediateAction") ?? undefined,
    evidenceRef: formData.get("evidenceRef") ?? undefined,
    photoUrl: formData.get("photoUrl") ?? undefined,
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
        // Submitted reports open immediately. reportedAt is stamped at submit
        // (drafts have none until submitted).
        return tx.incident.create({
          data: {
            centerId: d.centerId,
            reference,
            type: d.type,
            status: isImported ? "Imported" : isDraft ? "Draft" : "Open",
            severity: d.severity,
            occurredAt: new Date(d.occurredAt),
            // Imported records carry no report-gap (we don't know the original
            // report time); drafts have none until submitted.
            reportedAt:
              isImported || isDraft
                ? null
                : d.reportedAt
                  ? new Date(d.reportedAt)
                  : new Date(),
            ...incidentModuleData(formData),
            areaId: d.areaId,
            subAreaId: loc.subAreaId,
            location: loc.location,
            locationDetail: loc.locationDetail,
            description: d.description,
            immediateAction: d.immediateAction || null,
            evidenceRef: d.evidenceRef || null,
            photoUrl: d.photoUrl || null,
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
  if (!can(user, "manageIncidents")) {
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
    evidenceRef: formData.get("evidenceRef") ?? undefined,
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
        evidenceRef: d.evidenceRef || null,
        ...(reporterUpdate ?? {}),
      },
    });
  } catch (error) {
    console.error("updateIncident failed", error);
    return { ok: false, error: "Could not update the incident." };
  }

  // Edited inline on the incident workspace — revalidate in place rather than
  // redirecting (the old /edit page that relied on the redirect is retired).
  revalidateIncidents(d.id);
  return { ok: true };
}

// ─── Type-specific module fields (edit) ─────────────────────────────────────

// Which incident columns each module's editor renders. A module-edit writes
// ONLY the current type's columns, so it never nulls another module's data
// (matters for a reclassified or imported record that carries cross-type data)
// and never touches legacy / triage-set fields.
const MODULE_FIELD_KEYS: Record<string, string[]> = {
  accident: ["mechanism"],
  aquatic: [
    "aquaticRescueType",
    "eapLevel",
    "lifeguardsOnDuty",
    "timeInDifficulty",
    "spinalManagement",
    "secondaryDrowningAdvice",
  ],
  medical: ["presentingCondition", "conscious", "breathing", "casualtyHandover"],
  facility: [
    "afr",
    "freeChlorine",
    "combinedChlorine",
    "ph",
    "correctiveDosing",
    "closureStart",
    "closureEnd",
    "samplesSent",
  ],
  security: ["crimeReference", "gardaiNotified", "ejection"],
  missingChild: [
    "timeToLocateMins",
    "childAgeBand",
    "foundLocationClass",
    "proximityToWaterWhenFound",
    "missingChildResolution",
    "poolsCleared",
    "responseActions",
    "waterSearchInitiated",
    "lockdownInitiated",
    "emergencyServicesCalled",
  ],
};
const RESPONSE_FIELD_KEYS = ["ambulanceCalled", "aedUsed", "cprGiven", "firstAidBy"];

// Edit the captured per-type detail (mechanism, water chemistry, missing-child
// facts, …) after creation. Reuses IncidentModuleFields; only the incident's
// own type's columns are written. Triage-set fields are untouched.
export async function updateIncidentModules(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const incidentId = String(formData.get("incidentId") ?? "");
  if (!incidentId) return { ok: false, error: "Missing incident." };

  const existing = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, type: true },
  });
  if (!existing) return { ok: false, error: "Incident not found." };

  // Restrict the write to the columns this type's editor actually renders.
  const allowed = new Set<string>();
  for (const m of moduleFor(existing.type).modules) {
    for (const k of MODULE_FIELD_KEYS[m] ?? []) allowed.add(k);
  }
  if (typeHasResponseBlock(existing.type)) {
    for (const k of RESPONSE_FIELD_KEYS) allowed.add(k);
  }

  const parsed = incidentModuleData(formData) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const k of allowed) data[k] = parsed[k] ?? null;

  try {
    await db.incident.update({
      where: { id: incidentId },
      data: data as Prisma.IncidentUpdateInput,
    });
  } catch (error) {
    console.error("updateIncidentModules failed", error);
    return { ok: false, error: "Could not update the details." };
  }

  revalidateIncidents(incidentId);
  return { ok: true };
}

// ─── Investigation working-log note ─────────────────────────────────────────

export async function updateInvestigationNotes(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const parsed = investigationNotesSchema.safeParse({
    incidentId: formData.get("incidentId"),
    investigationNotes: formData.get("investigationNotes") ?? "",
  });
  if (!parsed.success) return invalidForm(parsed.error);
  const { incidentId, investigationNotes } = parsed.data;

  const existing = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Incident not found." };

  await db.incident.update({
    where: { id: incidentId },
    data: { investigationNotes: investigationNotes || null },
  });
  revalidateIncidents(incidentId);
  return { ok: true };
}

// ─── Investigation findings (root cause + conclusion) ───────────────────────

export async function updateInvestigationFindings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const parsed = investigationFindingsSchema.safeParse({
    incidentId: formData.get("incidentId"),
    rootCauseCategory: formData.get("rootCauseCategory") ?? "",
    rootCause: formData.get("rootCause") ?? "",
    investigationConclusion: formData.get("investigationConclusion") ?? "",
  });
  if (!parsed.success) return invalidForm(parsed.error);
  const { incidentId, rootCauseCategory, rootCause, investigationConclusion } =
    parsed.data;

  const existing = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Incident not found." };

  await db.incident.update({
    where: { id: incidentId },
    data: {
      rootCauseCategory: rootCauseCategory ?? null,
      rootCause: rootCause || null,
      investigationConclusion: investigationConclusion || null,
    },
  });
  revalidateIncidents(incidentId);
  return { ok: true };
}

// ─── Related hazards (investigation) ────────────────────────────────────────

// Sync the hazards flagged as related to this incident. The picker posts the
// full selected set; we diff it against the existing links so one save both
// adds and removes. Hazards are validated to belong to the incident's centre.
export async function setIncidentHazards(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const parsed = setIncidentHazardsSchema.safeParse({
    incidentId: formData.get("incidentId"),
    hazardIds: parseJsonArray(formData, "hazardIds"),
  });
  if (!parsed.success) return invalidForm(parsed.error);
  const { incidentId, hazardIds } = parsed.data;

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, centerId: true },
  });
  if (!incident) return { ok: false, error: "Incident not found." };

  const user = await getCurrentUser();

  // De-dupe, then keep only hazards that actually belong to this centre's
  // assessments (guards against tampered/stale ids).
  const requested = [...new Set(hazardIds)];
  const valid = requested.length
    ? await db.hazard.findMany({
        where: { id: { in: requested }, assessment: { centerId: incident.centerId } },
        select: { id: true },
      })
    : [];
  const finalIds = new Set(valid.map((h) => h.id));

  const existing = await db.incidentHazardLink.findMany({
    where: { incidentId },
    select: { hazardId: true },
  });
  const existingIds = new Set(existing.map((l) => l.hazardId));

  const toAdd = [...finalIds].filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !finalIds.has(id));

  if (toAdd.length === 0 && toRemove.length === 0) {
    return { ok: true }; // nothing changed
  }

  try {
    await db.$transaction([
      ...(toRemove.length
        ? [
            db.incidentHazardLink.deleteMany({
              where: { incidentId, hazardId: { in: toRemove } },
            }),
          ]
        : []),
      ...toAdd.map((hazardId) =>
        db.incidentHazardLink.create({
          data: { incidentId, hazardId, createdById: user?.id ?? null },
        }),
      ),
    ]);
  } catch (error) {
    console.error("setIncidentHazards failed", error);
    return { ok: false, error: "Could not update the related hazards." };
  }

  revalidateIncidents(incidentId);
  return { ok: true };
}

// Quick "remove" of a single hazard link from the related-hazards card.
export async function unlinkIncidentHazard(linkId: string): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const existing = await db.incidentHazardLink.findUnique({
    where: { id: linkId },
    select: { incidentId: true },
  });
  if (!existing) return { ok: false, error: "Hazard link not found." };

  await db.incidentHazardLink.delete({ where: { id: linkId } });
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

// ─── Capture / investigation photo ──────────────────────────────────────────

// Attach (or replace / clear with null) the single private-blob photo. The blob
// itself is uploaded browser-side via /api/incidents/blob-upload; this just
// stores the resulting URL.
export async function setIncidentPhoto(
  incidentId: string,
  photoUrl: string | null,
): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  if (photoUrl != null && (typeof photoUrl !== "string" || photoUrl.length > 600)) {
    return { ok: false, error: "Invalid photo reference." };
  }

  const existing = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Incident not found." };

  await db.incident.update({
    where: { id: incidentId },
    data: { photoUrl: photoUrl || null },
  });
  revalidateIncidents(incidentId);
  return { ok: true };
}

// ─── Evidence / information requests ─────────────────────────────────────────

// A request is "resolved" once it leaves the Requested state.
function evidenceResolvedAt(status: string): Date | null {
  return status === "Requested" ? null : new Date();
}

export async function addEvidenceRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const parsed = addEvidenceRequestSchema.safeParse({
    incidentId: formData.get("incidentId"),
    kind: formData.get("kind"),
    source: formData.get("source") ?? undefined,
    timeWindow: formData.get("timeWindow") ?? undefined,
    detail: formData.get("detail") ?? undefined,
    assignedToId: formData.get("assignedToId") ?? undefined,
    retentionDeadline: formData.get("retentionDeadline") ?? undefined,
    status: formData.get("status") ?? undefined,
    outcomeRef: formData.get("outcomeRef") ?? undefined,
  });
  if (!parsed.success) return invalidForm(parsed.error);
  const { incidentId, retentionDeadline, status, assignedToId, ...rest } = parsed.data;

  const assignee = await resolveAssignee(assignedToId);
  if (!assignee.ok) return { ok: false, error: assignee.error };

  const user = await getCurrentUser();
  await db.evidenceRequest.create({
    data: {
      incidentId,
      ...rest,
      assignedToId: assignee.id,
      assignedTo: assignee.name,
      status,
      // An outcome only makes sense once it's left the "Requested" state.
      outcomeRef: status === "Requested" ? null : (rest.outcomeRef ?? null),
      retentionDeadline: retentionDeadline ? new Date(retentionDeadline) : null,
      resolvedAt: evidenceResolvedAt(status),
      requestedBy: user?.name ?? user?.email ?? null,
      requestedById: user?.id ?? null,
    },
  });
  revalidateIncidents(incidentId);
  return { ok: true };
}

export async function updateEvidenceRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const parsed = updateEvidenceRequestSchema.safeParse({
    id: formData.get("id"),
    kind: formData.get("kind"),
    source: formData.get("source") ?? undefined,
    timeWindow: formData.get("timeWindow") ?? undefined,
    detail: formData.get("detail") ?? undefined,
    assignedToId: formData.get("assignedToId") ?? undefined,
    retentionDeadline: formData.get("retentionDeadline") ?? undefined,
    status: formData.get("status") ?? undefined,
    outcomeRef: formData.get("outcomeRef") ?? undefined,
  });
  if (!parsed.success) return invalidForm(parsed.error);
  const { id, retentionDeadline, status, assignedToId, ...rest } = parsed.data;

  const assignee = await resolveAssignee(assignedToId);
  if (!assignee.ok) return { ok: false, error: assignee.error };

  const existing = await db.evidenceRequest.findUnique({
    where: { id },
    select: { incidentId: true, resolvedAt: true },
  });
  if (!existing) return { ok: false, error: "Request not found." };

  await db.evidenceRequest.update({
    where: { id },
    data: {
      ...rest,
      assignedToId: assignee.id,
      assignedTo: assignee.name,
      status,
      // An outcome only makes sense once it's left the "Requested" state.
      outcomeRef: status === "Requested" ? null : (rest.outcomeRef ?? null),
      // A time window only applies to CCTV — clear it if switched to info.
      timeWindow: rest.kind === "CCTV" ? (rest.timeWindow ?? null) : null,
      retentionDeadline: retentionDeadline ? new Date(retentionDeadline) : null,
      // Keep the original resolved timestamp if it was already resolved.
      resolvedAt:
        status === "Requested" ? null : (existing.resolvedAt ?? new Date()),
    },
  });
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

export async function deleteEvidenceRequest(id: string): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const existing = await db.evidenceRequest.findUnique({
    where: { id },
    select: { incidentId: true },
  });
  if (!existing) return { ok: false, error: "Request not found." };

  await db.evidenceRequest.delete({ where: { id } });
  revalidateIncidents(existing.incidentId);
  return { ok: true };
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

export async function submitDraft(incidentId: string): Promise<FormState> {
  const denied = await denyUnless("reportIncidents");
  if (denied) return denied;

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, status: true, type: true, description: true, location: true },
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

  await db.incident.update({
    where: { id: incidentId },
    data: { status: "Open", reportedAt: new Date() },
  });
  revalidateIncidents(incidentId);
  return { ok: true };
}

export async function setIncidentStatus(
  incidentId: string,
  status: "Open" | "UnderInvestigation",
): Promise<FormState> {
  const denied = await denyUnless("investigateIncidents");
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
  const denied = await denyUnless("investigateIncidents");
  if (denied) return denied;

  const parsed = closeIncidentSchema.safeParse({
    incidentId: formData.get("incidentId"),
    closureNotes: formData.get("closureNotes"),
    closureOutcome: formData.get("closureOutcome") ?? undefined,
    riskAssessmentId: formData.get("riskAssessmentId") ?? undefined,
    reviewNotes: formData.get("reviewNotes") ?? undefined,
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const d = parsed.data;

  const user = await getCurrentUser();
  const incident = await db.incident.findUnique({
    where: { id: d.incidentId },
    select: {
      status: true,
      reference: true,
      centerId: true,
      areaId: true,
      description: true,
      followUpActions: { select: { status: true } },
    },
  });
  if (!incident) return { ok: false, error: "Incident not found." };
  if (incident.status !== "Open" && incident.status !== "UnderInvestigation") {
    return { ok: false, error: "Only open or under-investigation incidents can be closed." };
  }
  if (incident.followUpActions.some((a) => a.status !== "Complete")) {
    return { ok: false, error: "All follow-up actions must be complete before closing." };
  }

  // Resolve the risk-assessment outcome BEFORE closing, so a failure never
  // leaves a half-closed incident. The link is a first-class row, so it
  // survives reopen.
  let raLink:
    | { assessmentId: string; linkType: string; reviewRequestId: string | null; note: string | null }
    | null = null;
  let triageStatusUpdate: string | undefined;

  if (d.closureOutcome === "LinkExisting") {
    if (!can(user, "requestReview")) {
      return { ok: false, error: "You don't have permission to raise a review request." };
    }
    const ra = await db.riskAssessment.findFirst({
      where: { id: d.riskAssessmentId!, centerId: incident.centerId },
      select: { id: true },
    });
    if (!ra) return { ok: false, error: "Choose an assessment from this centre." };
    const review = await db.reviewRequest.create({
      data: {
        assessmentId: ra.id,
        requestedById: user!.id,
        notes:
          d.reviewNotes ||
          `Raised from incident ${incident.reference} close-out — a control linked to this assessment failed.`,
        sourceIncidentId: d.incidentId,
      },
    });
    raLink = { assessmentId: ra.id, linkType: "ControlFailureReview", reviewRequestId: review.id, note: d.reviewNotes || null };
    triageStatusUpdate = "ReferredToRA";
    await recordAudit(ra.id, user, "review_requested", `From incident ${incident.reference}`);
  } else if (d.closureOutcome === "SpawnDraft") {
    if (!can(user, "editContent")) {
      return { ok: false, error: "You don't have permission to create an assessment." };
    }
    if (!incident.areaId) {
      return {
        ok: false,
        error: "This incident has no area, so a new area assessment can't be seeded. Link an existing assessment instead.",
      };
    }
    // Don't create a duplicate Area assessment — each area is 1:1 with one.
    const existing = await findSubjectAssessment("Area", incident.areaId);
    if (existing) {
      const review = await db.reviewRequest.create({
        data: {
          assessmentId: existing.id,
          requestedById: user!.id,
          notes:
            d.reviewNotes ||
            `Raised from incident ${incident.reference} close-out — this area already has an assessment to review.`,
          sourceIncidentId: d.incidentId,
        },
      });
      raLink = { assessmentId: existing.id, linkType: "ControlFailureReview", reviewRequestId: review.id, note: "Linked the area's existing assessment (no duplicate created)." };
      triageStatusUpdate = "ReferredToRA";
      await recordAudit(existing.id, user, "review_requested", `From incident ${incident.reference}`);
    } else {
      let created: { id: string } | null = null;
      for (let attempt = 0; attempt < MAX_REFERENCE_RETRIES; attempt++) {
        try {
          const reference = await nextReference(incident.centerId);
          created = await db.riskAssessment.create({
            data: {
              reference,
              centerId: incident.centerId,
              subjectType: "Area",
              areaId: incident.areaId,
              status: "Draft",
              description: `Seeded from incident ${incident.reference}: ${incident.description.slice(0, 200)}`,
              nextReviewDate: computeNextReviewDate(new Date(), 12),
            },
            select: { id: true },
          });
          break;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" &&
            attempt < MAX_REFERENCE_RETRIES - 1
          ) {
            continue;
          }
          console.error("closeIncident seed-RA failed", error);
          return { ok: false, error: "Could not seed a new assessment. Please try again." };
        }
      }
      if (!created) {
        return { ok: false, error: "Could not generate a unique assessment reference. Please try again." };
      }
      raLink = { assessmentId: created.id, linkType: "SeededDraft", reviewRequestId: null, note: `Seeded from incident ${incident.reference}` };
      triageStatusUpdate = "ReferredToRA";
      await recordAudit(created.id, user, "created", `Seeded from incident ${incident.reference}`);
    }
  }

  await db.incident.update({
    where: { id: d.incidentId },
    data: {
      status: "Closed",
      closedAt: new Date(),
      closedBy: user?.name ?? user?.email ?? null,
      closureNotes: d.closureNotes,
      ...(triageStatusUpdate ? { triageStatus: triageStatusUpdate } : {}),
    },
  });

  if (raLink) {
    // Upsert so a reopen → re-close with the same assessment doesn't collide
    // on the (incident, assessment, linkType) unique.
    await db.incidentRiskAssessmentLink.upsert({
      where: {
        incidentId_assessmentId_linkType: {
          incidentId: d.incidentId,
          assessmentId: raLink.assessmentId,
          linkType: raLink.linkType,
        },
      },
      create: {
        incidentId: d.incidentId,
        assessmentId: raLink.assessmentId,
        linkType: raLink.linkType,
        reviewRequestId: raLink.reviewRequestId,
        note: raLink.note,
        createdById: user?.id ?? null,
      },
      update: { reviewRequestId: raLink.reviewRequestId, note: raLink.note },
    });
  }

  revalidateIncidents(d.incidentId);
  return { ok: true };
}

export async function reopenIncident(incidentId: string): Promise<FormState> {
  const denied = await denyUnless("investigateIncidents");
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
  const denied = await denyUnless("manageIncidents");
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
  const denied = await denyUnless("manageIncidents");
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
  const denied = await denyUnless("manageIncidents");
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
    memberId: formData.get("memberId") ?? undefined,
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
  const denied = await denyUnless("manageIncidents");
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
  const denied = await denyUnless("manageIncidents");
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
  const denied = await denyUnless("manageIncidents");
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
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const parsed = addFollowUpActionSchema.safeParse({
    incidentId: formData.get("incidentId"),
    description: formData.get("description"),
    assignedToId: formData.get("assignedToId"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    return invalidForm(parsed.error);
  }
  const d = parsed.data;

  const assignee = await resolveAssignee(d.assignedToId);
  if (!assignee.ok) return { ok: false, error: assignee.error };

  await db.followUpAction.create({
    data: {
      incidentId: d.incidentId,
      description: d.description,
      assignedToId: assignee.id,
      assignedTo: assignee.name,
      dueDate: new Date(d.dueDate),
      status: "Open",
    },
  });
  revalidateIncidents(d.incidentId);
  return { ok: true };
}

export async function updateFollowUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("manageIncidents");
  if (denied) return denied;

  const parsed = updateFollowUpActionSchema.safeParse({
    id: formData.get("id"),
    description: formData.get("description"),
    assignedToId: formData.get("assignedToId"),
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

  const assignee = await resolveAssignee(d.assignedToId);
  if (!assignee.ok) return { ok: false, error: assignee.error };

  const completed = d.status === "Complete";
  await db.followUpAction.update({
    where: { id: d.id },
    data: {
      description: d.description,
      assignedToId: assignee.id,
      assignedTo: assignee.name,
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
  const denied = await denyUnless("manageIncidents");
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
  const denied = await denyUnless("manageIncidents");
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
