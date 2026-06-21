"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reviewLogSchema } from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { computeNextReviewDate } from "@/lib/utils";
import { denyUnless, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { liveStatus } from "@/lib/approval";

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
    select: {
      reviewFrequencyMonths: true,
      status: true,
      ownerApprovedByName: true,
      ceoApprovedByName: true,
    },
  });
  if (!assessment) return { ok: false, error: "Assessment not found." };

  const reviewedDate = new Date(d.reviewedDate);
  const nextReviewDate = computeNextReviewDate(
    reviewedDate,
    assessment.reviewFrequencyMonths,
  );

  // Logging a review rolls the next-review date forward; the status is then
  // derived. A fully-signed assessment that had gone Under review for being
  // overdue returns to Approved; otherwise it stays Under review. Drafts and
  // archived assessments keep their status.
  const nextStatus =
    assessment.status === "Draft" || assessment.status === "Archived"
      ? assessment.status
      : liveStatus({
          ownerApprovedByName: assessment.ownerApprovedByName,
          ceoApprovedByName: assessment.ceoApprovedByName,
          nextReviewDate,
        });

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
      data: { lastReviewedDate: reviewedDate, nextReviewDate, status: nextStatus },
    }),
  ]);

  await recordAudit(
    d.assessmentId,
    await getCurrentUser(),
    "review_logged",
    `Outcome: ${d.outcome} · status → ${nextStatus}`,
  );

  revalidatePath("/monitoring");
  revalidatePath("/");
  revalidatePath("/assessments");
  revalidatePath(`/assessments/${d.assessmentId}`);
  return { ok: true };
}
