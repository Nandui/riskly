"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reviewLogSchema } from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { computeNextReviewDate } from "@/lib/utils";
import { denyUnless, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function logReview(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("review");
  if (denied) return denied;

  const parsed = reviewLogSchema.safeParse({
    assessmentId: formData.get("assessmentId"),
    reviewedDate: formData.get("reviewedDate"),
    reviewerName: formData.get("reviewerName"),
    outcome: formData.get("outcome") || "NoChanges",
    notes: formData.get("notes"),
    newStatus: formData.get("newStatus") || "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the review details.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;

  const assessment = await db.riskAssessment.findUnique({
    where: { id: d.assessmentId },
    select: { reviewFrequencyMonths: true },
  });
  if (!assessment) return { ok: false, error: "Assessment not found." };

  const reviewedDate = new Date(d.reviewedDate);
  const nextReviewDate = computeNextReviewDate(
    reviewedDate,
    assessment.reviewFrequencyMonths,
  );

  await db.$transaction([
    db.reviewLog.create({
      data: {
        assessmentId: d.assessmentId,
        reviewedDate,
        reviewerName: emptyToNull(d.reviewerName),
        outcome: d.outcome,
        notes: emptyToNull(d.notes),
        nextReviewDate,
      },
    }),
    db.riskAssessment.update({
      where: { id: d.assessmentId },
      data: {
        lastReviewedDate: reviewedDate,
        nextReviewDate,
        ...(d.newStatus ? { status: d.newStatus } : {}),
      },
    }),
  ]);

  await recordAudit(
    d.assessmentId,
    await getCurrentUser(),
    "review_logged",
    `Outcome: ${d.outcome}${d.newStatus ? ` · status → ${d.newStatus}` : ""}`,
  );

  revalidatePath("/monitoring");
  revalidatePath("/");
  revalidatePath("/assessments");
  revalidatePath("/reference");
  revalidatePath(`/assessments/${d.assessmentId}`);
  return { ok: true };
}
