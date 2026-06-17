"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assessmentSchema, type AssessmentInput } from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { computeNextReviewDate } from "@/lib/utils";
import { nextReference } from "@/lib/data/assessments";

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
    title: formData.get("title"),
    description: formData.get("description"),
    centerId: formData.get("centerId"),
    areaId: formData.get("areaId"),
    roleId: formData.get("roleId"),
    activityId: formData.get("activityId"),
    status: formData.get("status") || "Draft",
    assessorName: formData.get("assessorName"),
    approvedByName: formData.get("approvedByName"),
    assessmentDate: formData.get("assessmentDate"),
    reviewFrequencyMonths: formData.get("reviewFrequencyMonths"),
    hazards,
  });
}

function hazardCreateData(hazards: AssessmentInput["hazards"]) {
  return hazards.map((h, i) => ({
    sortOrder: i,
    hazardDescription: h.hazardDescription,
    whoAtRisk: emptyToNull(h.whoAtRisk),
    existingControls: emptyToNull(h.existingControls),
    initialLikelihood: h.initialLikelihood,
    initialSeverity: h.initialSeverity,
    additionalControls: emptyToNull(h.additionalControls),
    residualLikelihood: h.residualLikelihood,
    residualSeverity: h.residualSeverity,
    actionOwnerName: emptyToNull(h.actionOwnerName),
    actionDueDate: h.actionDueDate ? new Date(h.actionDueDate) : null,
    actionStatus: h.actionStatus ?? "NA",
  }));
}

export async function createAssessment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseAssessmentForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const assessmentDate = new Date(d.assessmentDate);
  const nextReviewDate = computeNextReviewDate(
    assessmentDate,
    d.reviewFrequencyMonths,
  );

  const created = await db.riskAssessment.create({
    data: {
      reference: await nextReference(),
      title: d.title,
      description: emptyToNull(d.description),
      centerId: d.centerId,
      areaId: d.areaId,
      roleId: emptyToNull(d.roleId),
      activityId: emptyToNull(d.activityId),
      status: d.status,
      assessorName: emptyToNull(d.assessorName),
      approvedByName: emptyToNull(d.approvedByName),
      assessmentDate,
      reviewFrequencyMonths: d.reviewFrequencyMonths,
      lastReviewedDate: d.status === "Draft" ? null : assessmentDate,
      nextReviewDate,
      hazards: { create: hazardCreateData(d.hazards) },
    },
  });

  revalidateAssessments(created.id);
  redirect(`/assessments/${created.id}`);
}

export async function updateAssessment(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseAssessmentForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const existing = await db.riskAssessment.findUnique({
    where: { id },
    select: { lastReviewedDate: true },
  });
  const assessmentDate = new Date(d.assessmentDate);
  const base = existing?.lastReviewedDate ?? assessmentDate;
  const nextReviewDate = computeNextReviewDate(base, d.reviewFrequencyMonths);

  await db.$transaction([
    db.hazard.deleteMany({ where: { assessmentId: id } }),
    db.riskAssessment.update({
      where: { id },
      data: {
        title: d.title,
        description: emptyToNull(d.description),
        centerId: d.centerId,
        areaId: d.areaId,
        roleId: emptyToNull(d.roleId),
        activityId: emptyToNull(d.activityId),
        status: d.status,
        assessorName: emptyToNull(d.assessorName),
        approvedByName: emptyToNull(d.approvedByName),
        assessmentDate,
        reviewFrequencyMonths: d.reviewFrequencyMonths,
        nextReviewDate,
        hazards: { create: hazardCreateData(d.hazards) },
      },
    }),
  ]);

  revalidateAssessments(id);
  redirect(`/assessments/${id}`);
}

export async function deleteAssessment(id: string): Promise<FormState> {
  await db.riskAssessment.delete({ where: { id } });
  revalidateAssessments(id);
  redirect("/assessments");
}
