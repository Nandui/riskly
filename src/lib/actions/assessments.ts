"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assessmentSchema, type AssessmentInput } from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { computeNextReviewDate } from "@/lib/utils";
import { nextReference } from "@/lib/data/assessments";
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

function hazardCreateData(hazards: AssessmentInput["hazards"]) {
  return hazards.map((h, i) => ({
    sortOrder: i,
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
      hazards: { create: hazardCreateData(d.hazards) },
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

  const existing = await db.riskAssessment.findUnique({
    where: { id },
    select: { lastReviewedDate: true, status: true, approvedByName: true },
  });
  const assessmentDate = new Date(d.assessmentDate);
  const base = existing?.lastReviewedDate ?? assessmentDate;
  const nextReviewDate = computeNextReviewDate(base, d.reviewFrequencyMonths);
  // Editing the content invalidates any prior sign-off.
  const wasApproved = Boolean(existing?.approvedByName);
  const statusChanged = existing != null && existing.status !== d.status;

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
        ...(wasApproved
          ? { approvedByName: null, approvedById: null, approvedAt: null }
          : {}),
        hazards: { create: hazardCreateData(d.hazards) },
        ownerId: emptyToNull(d.ownerId),
        departmentId: emptyToNull(d.departmentId),
      },
    }),
  ]);

  const user = await getCurrentUser();
  await recordAudit(
    id,
    user,
    "updated",
    statusChanged ? `Status: ${existing!.status} → ${d.status}` : null,
  );
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
  await db.riskAssessment.delete({ where: { id } });
  revalidateAssessments(id);
  redirect("/assessments");
}
