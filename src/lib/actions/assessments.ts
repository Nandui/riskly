"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  assessmentSchema,
  hazardSchema,
  type AssessmentInput,
} from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { computeNextReviewDate, toDateInputValue } from "@/lib/utils";
import {
  nextReference,
  assessmentTitle,
  findAreaAssessment,
} from "@/lib/data/assessments";
import { denyUnless, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

function revalidateAssessments(id?: string) {
  revalidatePath("/assessments");
  if (id) revalidatePath(`/assessments/${id}`);
  revalidatePath("/monitoring");
  revalidatePath("/reference");
  revalidatePath("/");
}

function parseAssessmentForm(formData: FormData) {
  let hazards: unknown = [];
  const raw = formData.get("hazards");
  if (typeof raw === "string" && raw.trim()) {
    try {
      hazards = JSON.parse(raw);
    } catch {
      hazards = [];
    }
  }
  return assessmentSchema.safeParse({
    description: formData.get("description"),
    centerId: formData.get("centerId"),
    subjectType: formData.get("subjectType") || "Area",
    subjectId: formData.get("subjectId"),
    status: formData.get("status") || "Draft",
    assessorName: formData.get("assessorName"),
    assessmentDate: formData.get("assessmentDate"),
    reviewFrequencyMonths: formData.get("reviewFrequencyMonths"),
    hazards,
    ownerId: formData.get("ownerId"),
    departmentId: formData.get("departmentId"),
  });
}

type SubjectLink =
  | { ok: true; areaId: string | null; roleId: string | null; activityId: string | null }
  | { ok: false; error: string };

// Map the chosen subject (one of area/role/activity) onto the FK columns.
async function resolveSubject(d: AssessmentInput): Promise<SubjectLink> {
  if (d.subjectType === "Area") {
    const area = await db.area.findUnique({
      where: { id: d.subjectId },
      select: { centerId: true },
    });
    if (!area) return { ok: false, error: "Selected area not found." };
    if (area.centerId !== d.centerId)
      return { ok: false, error: "That area belongs to a different centre." };
    return { ok: true, areaId: d.subjectId, roleId: null, activityId: null };
  }
  if (d.subjectType === "Role") {
    const role = await db.role.findUnique({
      where: { id: d.subjectId },
      select: { id: true },
    });
    if (!role) return { ok: false, error: "Selected role not found." };
    return { ok: true, areaId: null, roleId: d.subjectId, activityId: null };
  }
  const activity = await db.activity.findUnique({
    where: { id: d.subjectId },
    select: { id: true },
  });
  if (!activity) return { ok: false, error: "Selected activity not found." };
  return { ok: true, areaId: null, roleId: null, activityId: d.subjectId };
}

function hazardCreateData(
  hazards: AssessmentInput["hazards"],
  seqFor: (h: AssessmentInput["hazards"][number], i: number) => number,
) {
  return hazards.map((h, i) => ({
    sortOrder: i,
    seq: seqFor(h, i),
    hazard: h.hazard,
    riskFactor: emptyToNull(h.riskFactor),
    personAtRisk: emptyToNull(h.personAtRisk),
    consequence: emptyToNull(h.consequence),
    currentControls: emptyToNull(h.currentControls),
    likelihood: h.likelihood,
    severity: h.severity,
    riskCategory: h.riskCategory ?? "Physical",
  }));
}

type ExistingForDiff = {
  status: string;
  centerId: string;
  subjectType: string;
  areaId: string | null;
  roleId: string | null;
  activityId: string | null;
  assessorName: string | null;
  reviewFrequencyMonths: number;
  assessmentDate: Date;
  ownerId: string | null;
  departmentId: string | null;
  description: string | null;
  hazards: {
    id: string;
    hazard: string;
    likelihood: number;
    severity: number;
    riskFactor: string | null;
    personAtRisk: string | null;
    consequence: string | null;
    currentControls: string | null;
    riskCategory: string;
  }[];
};

// Build a concise human-readable summary of what an edit changed, for the
// audit detail (matched by hazard id, sent from the form).
function summariseEdit(
  old: ExistingForDiff,
  d: AssessmentInput,
  subject: { areaId: string | null; roleId: string | null; activityId: string | null },
): string | null {
  const norm = (s: string | null | undefined) => (s ?? "").trim();
  const changes: string[] = [];

  if (old.status !== d.status)
    changes.push(`Status: ${old.status} → ${d.status}`);

  const oldSubject = old.areaId ?? old.roleId ?? old.activityId ?? null;
  const newSubject = subject.areaId ?? subject.roleId ?? subject.activityId ?? null;
  if (old.subjectType !== d.subjectType || oldSubject !== newSubject)
    changes.push("Subject changed");
  if (old.centerId !== d.centerId) changes.push("Centre changed");
  if ((old.ownerId ?? "") !== norm(d.ownerId)) changes.push("Owner changed");
  if ((old.departmentId ?? "") !== norm(d.departmentId))
    changes.push("Department changed");
  if (norm(old.assessorName) !== norm(d.assessorName))
    changes.push("Assessor changed");
  if (old.reviewFrequencyMonths !== d.reviewFrequencyMonths)
    changes.push("Review frequency changed");
  if (toDateInputValue(old.assessmentDate) !== d.assessmentDate)
    changes.push("Assessment date changed");
  if (norm(old.description) !== norm(d.description))
    changes.push("Scope changed");

  const oldById = new Map(old.hazards.map((h) => [h.id, h]));
  const newIds = new Set(
    d.hazards.map((h) => h.id).filter((x): x is string => Boolean(x)),
  );
  let added = 0;
  let removed = 0;
  let rerated = 0;
  let edited = 0;
  for (const h of d.hazards) {
    const oh = h.id ? oldById.get(h.id) : undefined;
    if (!oh) {
      added++;
      continue;
    }
    if (oh.likelihood !== h.likelihood || oh.severity !== h.severity) {
      rerated++;
      continue;
    }
    const textChanged =
      norm(oh.hazard) !== norm(h.hazard) ||
      norm(oh.riskFactor) !== norm(h.riskFactor) ||
      norm(oh.personAtRisk) !== norm(h.personAtRisk) ||
      norm(oh.consequence) !== norm(h.consequence) ||
      norm(oh.currentControls) !== norm(h.currentControls) ||
      oh.riskCategory !== h.riskCategory;
    if (textChanged) edited++;
  }
  for (const oh of old.hazards) if (!newIds.has(oh.id)) removed++;

  const hz: string[] = [];
  if (added) hz.push(`${added} added`);
  if (removed) hz.push(`${removed} removed`);
  if (rerated) hz.push(`${rerated} re-rated`);
  if (edited) hz.push(`${edited} edited`);
  if (hz.length) changes.push(`Hazards: ${hz.join(", ")}`);

  return changes.length ? changes.join(" · ") : null;
}

export async function createAssessment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;

  const parsed = parseAssessmentForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const subject = await resolveSubject(d);
  if (!subject.ok) return { ok: false, error: subject.error };

  // One assessment per area: block a duplicate for an already-assessed area.
  if (subject.areaId) {
    const existing = await findAreaAssessment(subject.areaId);
    if (existing) {
      return {
        ok: false,
        error: `An assessment already exists for this area (${existing.reference}). Edit that one instead of creating a duplicate.`,
        fieldErrors: { subjectId: "This area already has an assessment." },
      };
    }
  }

  const assessmentDate = new Date(d.assessmentDate);
  const nextReviewDate = computeNextReviewDate(
    assessmentDate,
    d.reviewFrequencyMonths,
  );

  const created = await db.riskAssessment.create({
    data: {
      reference: await nextReference(d.centerId),
      description: emptyToNull(d.description),
      centerId: d.centerId,
      subjectType: d.subjectType,
      areaId: subject.areaId,
      roleId: subject.roleId,
      activityId: subject.activityId,
      status: d.status,
      assessorName: emptyToNull(d.assessorName),
      assessmentDate,
      reviewFrequencyMonths: d.reviewFrequencyMonths,
      lastReviewedDate: d.status === "Draft" ? null : assessmentDate,
      nextReviewDate,
      hazardSeq: d.hazards.length,
      hazards: { create: hazardCreateData(d.hazards, (_h, i) => i + 1) },
      ownerId: emptyToNull(d.ownerId),
      departmentId: emptyToNull(d.departmentId),
    },
  });

  await recordAudit(created.id, await getCurrentUser(), "created");

  revalidateAssessments(created.id);
  redirect(`/assessments/${created.id}`);
}

export async function updateAssessment(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;

  const parsed = parseAssessmentForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const subject = await resolveSubject(d);
  if (!subject.ok) return { ok: false, error: subject.error };

  // One assessment per area: block moving onto an area another assessment has.
  if (subject.areaId) {
    const clash = await findAreaAssessment(subject.areaId, id);
    if (clash) {
      return {
        ok: false,
        error: `Another assessment already covers this area (${clash.reference}).`,
        fieldErrors: { subjectId: "This area already has an assessment." },
      };
    }
  }

  const existing = await db.riskAssessment.findUnique({
    where: { id },
    select: {
      lastReviewedDate: true,
      status: true,
      approvedByName: true,
      centerId: true,
      subjectType: true,
      areaId: true,
      roleId: true,
      activityId: true,
      assessorName: true,
      reviewFrequencyMonths: true,
      assessmentDate: true,
      ownerId: true,
      departmentId: true,
      description: true,
      hazardSeq: true,
      hazards: {
        select: {
          id: true,
          seq: true,
          hazard: true,
          likelihood: true,
          severity: true,
          riskFactor: true,
          personAtRisk: true,
          consequence: true,
          currentControls: true,
          riskCategory: true,
        },
      },
    },
  });
  const assessmentDate = new Date(d.assessmentDate);
  const base = existing?.lastReviewedDate ?? assessmentDate;
  const nextReviewDate = computeNextReviewDate(base, d.reviewFrequencyMonths);
  // Editing the content invalidates any prior sign-off.
  const wasApproved = Boolean(existing?.approvedByName);
  const changeSummary = existing ? summariseEdit(existing, d, subject) : null;

  // Preserve each existing hazard's permanent seq (matched by id) and allocate
  // brand-new ones above the high-water mark, so hazard numbers are never reused
  // even though the rows are deleted and recreated below.
  const seqById = new Map((existing?.hazards ?? []).map((h) => [h.id, h.seq]));
  let hazardSeq = existing?.hazardSeq ?? 0;
  for (const h of existing?.hazards ?? []) hazardSeq = Math.max(hazardSeq, h.seq);
  const hazardsCreate = hazardCreateData(d.hazards, (h) => {
    const kept = h.id ? seqById.get(h.id) : undefined;
    return kept ?? ++hazardSeq;
  });

  await db.$transaction([
    db.hazard.deleteMany({ where: { assessmentId: id } }),
    db.riskAssessment.update({
      where: { id },
      data: {
        description: emptyToNull(d.description),
        centerId: d.centerId,
        subjectType: d.subjectType,
        areaId: subject.areaId,
        roleId: subject.roleId,
        activityId: subject.activityId,
        status: d.status,
        assessorName: emptyToNull(d.assessorName),
        assessmentDate,
        reviewFrequencyMonths: d.reviewFrequencyMonths,
        nextReviewDate,
        hazardSeq,
        ...(wasApproved
          ? { approvedByName: null, approvedById: null, approvedAt: null }
          : {}),
        hazards: { create: hazardsCreate },
        ownerId: emptyToNull(d.ownerId),
        departmentId: emptyToNull(d.departmentId),
      },
    }),
  ]);

  const user = await getCurrentUser();
  await recordAudit(id, user, "updated", changeSummary);
  if (wasApproved) {
    await recordAudit(
      id,
      user,
      "approval_revoked",
      "Reset because the assessment was edited",
    );
  }

  revalidateAssessments(id);
  redirect(`/assessments/${id}`);
}

export async function deleteAssessment(id: string): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  // Log the deletion first. Audit rows are orphaned (not cascaded) on delete,
  // so this entry and the assessment's whole trail survive for review.
  const a = await db.riskAssessment.findUnique({
    where: { id },
    include: {
      area: { select: { name: true } },
      role: { select: { name: true } },
      activity: { select: { name: true } },
    },
  });
  if (a) {
    await recordAudit(
      id,
      await getCurrentUser(),
      "deleted",
      `${a.reference} · ${assessmentTitle(a)}`,
    );
  }
  await db.riskAssessment.delete({ where: { id } });
  revalidateAssessments(id);
  redirect("/assessments");
}

// Add a single hazard to an existing assessment. This is a material change, so
// it sends the assessment back to Under review and clears any prior sign-off.
export async function addHazard(
  assessmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;

  const parsed = hazardSchema.safeParse({
    hazard: formData.get("hazard"),
    riskFactor: formData.get("riskFactor"),
    personAtRisk: formData.get("personAtRisk"),
    consequence: formData.get("consequence"),
    currentControls: formData.get("currentControls"),
    likelihood: formData.get("likelihood"),
    severity: formData.get("severity"),
    riskCategory: formData.get("riskCategory"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const d = parsed.data;

  const existing = await db.riskAssessment.findUnique({
    where: { id: assessmentId },
    select: { status: true, approvedByName: true, hazardSeq: true },
  });
  if (!existing) return { ok: false, error: "Assessment not found." };

  const max = await db.hazard.aggregate({
    where: { assessmentId },
    _max: { sortOrder: true, seq: true },
  });
  // Never reuse a hazard number: allocate above the assessment's high-water mark.
  const nextSeq = Math.max(existing.hazardSeq, max._max.seq ?? 0) + 1;
  const wasApproved = Boolean(existing.approvedByName);
  // Archived assessments keep their status; everything else goes Under review.
  const toReview = existing.status !== "Archived";

  await db.hazard.create({
    data: {
      assessmentId,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      seq: nextSeq,
      hazard: d.hazard,
      riskFactor: emptyToNull(d.riskFactor),
      personAtRisk: emptyToNull(d.personAtRisk),
      consequence: emptyToNull(d.consequence),
      currentControls: emptyToNull(d.currentControls),
      likelihood: d.likelihood,
      severity: d.severity,
      riskCategory: d.riskCategory ?? "Physical",
    },
  });

  await db.riskAssessment.update({
    where: { id: assessmentId },
    data: {
      hazardSeq: nextSeq,
      ...(toReview ? { status: "UnderReview" } : {}),
      ...(wasApproved
        ? { approvedByName: null, approvedById: null, approvedAt: null }
        : {}),
    },
  });

  const user = await getCurrentUser();
  await recordAudit(assessmentId, user, "hazard_added", d.hazard);
  if (wasApproved) {
    await recordAudit(
      assessmentId,
      user,
      "approval_revoked",
      "Reset because a hazard was added",
    );
  }

  revalidateAssessments(assessmentId);
  return { ok: true };
}
