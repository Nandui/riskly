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
  findSubjectAssessment,
} from "@/lib/data/assessments";
import { denyUnless, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { CLEARED_APPROVAL, APPROVAL_FLAGS_SELECT, hasAnyApproval } from "@/lib/approval";

function revalidateAssessments(id?: string) {
  revalidatePath("/assessments");
  if (id) revalidatePath(`/assessments/${id}`);
  revalidatePath("/monitoring");
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

  // One assessment per subject: block a duplicate for an already-assessed
  // area, role or activity.
  const existing = await findSubjectAssessment(d.subjectType, d.subjectId);
  if (existing) {
    const noun = d.subjectType.toLowerCase();
    return {
      ok: false,
      error: `An assessment already exists for this ${noun} (${existing.reference}). Edit that one instead of creating a duplicate.`,
      fieldErrors: { subjectId: `This ${noun} already has an assessment.` },
    };
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

  // One assessment per subject: block moving onto an area, role or activity
  // that another assessment already covers.
  const clash = await findSubjectAssessment(d.subjectType, d.subjectId, id);
  if (clash) {
    const noun = d.subjectType.toLowerCase();
    return {
      ok: false,
      error: `Another assessment already covers this ${noun} (${clash.reference}).`,
      fieldErrors: { subjectId: `This ${noun} already has an assessment.` },
    };
  }

  const existing = await db.riskAssessment.findUnique({
    where: { id },
    select: {
      lastReviewedDate: true,
      status: true,
      ...APPROVAL_FLAGS_SELECT,
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
  const wasApproved = existing ? hasAnyApproval(existing) : false;
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
          ? CLEARED_APPROVAL
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
    select: { status: true, ...APPROVAL_FLAGS_SELECT, hazardSeq: true },
  });
  if (!existing) return { ok: false, error: "Assessment not found." };

  const max = await db.hazard.aggregate({
    where: { assessmentId },
    _max: { sortOrder: true, seq: true },
  });
  // Never reuse a hazard number: allocate above the assessment's high-water mark.
  const nextSeq = Math.max(existing.hazardSeq, max._max.seq ?? 0) + 1;
  const wasApproved = hasAnyApproval(existing);
  // Drafts stay drafts and archived stays archived; an in-force or under-review
  // assessment goes (back) to Under review.
  const toReview =
    existing.status !== "Archived" && existing.status !== "Draft";

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
        ? CLEARED_APPROVAL
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

// Edit a single hazard in place from the assessment page. Like adding one, this
// is a material change: it sends the assessment back to Under review and clears
// any prior sign-off. Logged as `hazard_updated`.
export async function updateHazard(
  hazardId: string,
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

  const existing = await db.hazard.findUnique({
    where: { id: hazardId },
    select: {
      assessmentId: true,
      assessment: { select: { status: true, ...APPROVAL_FLAGS_SELECT } },
    },
  });
  if (!existing) return { ok: false, error: "Hazard not found." };

  const assessmentId = existing.assessmentId;
  const wasApproved = hasAnyApproval(existing.assessment);
  const toReview =
    existing.assessment.status !== "Archived" &&
    existing.assessment.status !== "Draft";

  await db.hazard.update({
    where: { id: hazardId },
    data: {
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

  if (toReview || wasApproved) {
    await db.riskAssessment.update({
      where: { id: assessmentId },
      data: {
        ...(toReview ? { status: "UnderReview" } : {}),
        ...(wasApproved
          ? CLEARED_APPROVAL
          : {}),
      },
    });
  }

  const user = await getCurrentUser();
  await recordAudit(assessmentId, user, "hazard_updated", d.hazard);
  if (wasApproved) {
    await recordAudit(
      assessmentId,
      user,
      "approval_revoked",
      "Reset because a hazard was edited",
    );
  }

  revalidateAssessments(assessmentId);
  return { ok: true };
}

// Remove a single hazard from the assessment page. Another material change:
// sends the assessment back to Under review and clears any sign-off. The seq is
// never reused, so the hazard's number is retired. Logged as `hazard_removed`.
export async function deleteHazard(hazardId: string): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;

  const existing = await db.hazard.findUnique({
    where: { id: hazardId },
    select: {
      hazard: true,
      assessmentId: true,
      assessment: { select: { status: true, ...APPROVAL_FLAGS_SELECT } },
    },
  });
  if (!existing) return { ok: false, error: "Hazard not found." };

  const assessmentId = existing.assessmentId;
  const wasApproved = hasAnyApproval(existing.assessment);
  const toReview =
    existing.assessment.status !== "Archived" &&
    existing.assessment.status !== "Draft";

  await db.hazard.delete({ where: { id: hazardId } });

  if (toReview || wasApproved) {
    await db.riskAssessment.update({
      where: { id: assessmentId },
      data: {
        ...(toReview ? { status: "UnderReview" } : {}),
        ...(wasApproved
          ? CLEARED_APPROVAL
          : {}),
      },
    });
  }

  const user = await getCurrentUser();
  await recordAudit(assessmentId, user, "hazard_removed", existing.hazard);
  if (wasApproved) {
    await recordAudit(
      assessmentId,
      user,
      "approval_revoked",
      "Reset because a hazard was removed",
    );
  }

  revalidateAssessments(assessmentId);
  return { ok: true };
}

// Copy a selection of hazards from one assessment into another existing
// assessment (which may be in a different centre). Like adding a hazard, this
// is a material change to the TARGET: it goes back to Under review and any
// sign-off there is cleared. The copies are appended with fresh, never-reused
// seq numbers; the source is left untouched.
export async function copyHazards(
  sourceId: string,
  targetId: string,
  hazardIds: string[],
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;

  if (!targetId || targetId === sourceId) {
    return { ok: false, error: "Choose a different assessment to copy into." };
  }
  const ids = Array.from(new Set(hazardIds.filter(Boolean)));
  if (!ids.length) {
    return { ok: false, error: "Select at least one hazard to copy." };
  }

  const [target, source, sources] = await Promise.all([
    db.riskAssessment.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        reference: true,
        status: true,
        ...APPROVAL_FLAGS_SELECT,
        hazardSeq: true,
      },
    }),
    db.riskAssessment.findUnique({
      where: { id: sourceId },
      select: { reference: true },
    }),
    // Only hazards that actually belong to the stated source can be copied.
    db.hazard.findMany({
      where: { id: { in: ids }, assessmentId: sourceId },
      orderBy: { sortOrder: "asc" },
      select: {
        hazard: true,
        riskFactor: true,
        personAtRisk: true,
        consequence: true,
        currentControls: true,
        likelihood: true,
        severity: true,
        riskCategory: true,
      },
    }),
  ]);
  if (!target) return { ok: false, error: "That assessment no longer exists." };
  if (!sources.length) {
    return { ok: false, error: "Those hazards are no longer available to copy." };
  }

  // Allocate seq/sortOrder above the target's high-water mark so a hazard
  // number is never reused, even after deletions.
  const agg = await db.hazard.aggregate({
    where: { assessmentId: targetId },
    _max: { sortOrder: true, seq: true },
  });
  let seq = Math.max(target.hazardSeq, agg._max.seq ?? 0);
  let sort = agg._max.sortOrder ?? 0;
  const data = sources.map((h) => ({
    assessmentId: targetId,
    sortOrder: ++sort,
    seq: ++seq,
    hazard: h.hazard,
    riskFactor: h.riskFactor,
    personAtRisk: h.personAtRisk,
    consequence: h.consequence,
    currentControls: h.currentControls,
    likelihood: h.likelihood,
    severity: h.severity,
    riskCategory: h.riskCategory,
  }));

  const wasApproved = hasAnyApproval(target);
  const toReview = target.status !== "Archived" && target.status !== "Draft";

  await db.$transaction([
    db.hazard.createMany({ data }),
    db.riskAssessment.update({
      where: { id: targetId },
      data: {
        hazardSeq: seq,
        ...(toReview ? { status: "UnderReview" } : {}),
        ...(wasApproved ? CLEARED_APPROVAL : {}),
      },
    }),
  ]);

  const user = await getCurrentUser();
  await recordAudit(
    targetId,
    user,
    "hazard_added",
    `Copied ${data.length} hazard${data.length === 1 ? "" : "s"} from ${source?.reference ?? "another assessment"}`,
  );
  if (wasApproved) {
    await recordAudit(
      targetId,
      user,
      "approval_revoked",
      "Reset because hazards were copied in",
    );
  }

  revalidateAssessments(targetId);
  return { ok: true };
}
