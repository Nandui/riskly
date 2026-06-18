"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reviewRequestSchema } from "@/lib/validation";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { getCurrentUser, can } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

function revalidate(assessmentId: string) {
  revalidatePath(`/assessments/${assessmentId}`);
  revalidatePath("/monitoring");
  revalidatePath("/");
}

export async function requestReview(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user, "requestReview")) {
    return { ok: false, error: "You don't have permission to request a review." };
  }
  const parsed = reviewRequestSchema.safeParse({
    assessmentId: formData.get("assessmentId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  await db.reviewRequest.create({
    data: {
      assessmentId: parsed.data.assessmentId,
      requestedById: user.id,
      notes: parsed.data.notes,
    },
  });
  await recordAudit(
    parsed.data.assessmentId,
    user,
    "review_requested",
    parsed.data.notes,
  );
  revalidate(parsed.data.assessmentId);
  return { ok: true };
}

export async function resolveReviewRequest(
  id: string,
  action: "Actioned" | "Dismissed",
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user, "review")) {
    return { ok: false, error: "You don't have permission to do this." };
  }
  const req = await db.reviewRequest.update({
    where: { id },
    data: { status: action, resolvedAt: new Date(), resolvedById: user.id },
    select: { assessmentId: true },
  });
  await recordAudit(
    req.assessmentId,
    user,
    "review_request_resolved",
    `Request ${action.toLowerCase()}`,
  );
  revalidate(req.assessmentId);
  return { ok: true };
}
