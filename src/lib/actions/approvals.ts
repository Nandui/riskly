"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";

function revalidate(id: string) {
  revalidatePath(`/assessments/${id}`);
  revalidatePath("/assessments");
  revalidatePath("/reference");
  revalidatePath("/monitoring");
  revalidatePath("/");
}

// Sign-off: anyone who can review can approve. Records the approver + time and
// moves a Draft/Under-review assessment to Active (in force) — an approved
// assessment is no longer a draft or under review.
export async function approveAssessment(id: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user, "review")) {
    return { ok: false, error: "You don't have permission to approve." };
  }
  const name = user.name ?? user.email ?? "Unknown";

  const current = await db.riskAssessment.findUnique({
    where: { id },
    select: { status: true },
  });
  const toActive =
    current != null && current.status !== "Active" && current.status !== "Archived";

  await db.riskAssessment.update({
    where: { id },
    data: {
      approvedByName: name,
      approvedById: user.id,
      approvedAt: new Date(),
      ...(toActive ? { status: "Active" } : {}),
    },
  });

  await recordAudit(
    id,
    user,
    "approved",
    toActive ? `Approved by ${name} · status → Active` : `Approved by ${name}`,
  );
  revalidate(id);
  return { ok: true };
}

export async function revokeApproval(id: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user, "review")) {
    return { ok: false, error: "You don't have permission to do this." };
  }

  const current = await db.riskAssessment.findUnique({
    where: { id },
    select: { status: true },
  });
  // Withdrawing sign-off sends it back to Under review (unless archived).
  const toReview = current != null && current.status !== "Archived";

  await db.riskAssessment.update({
    where: { id },
    data: {
      approvedByName: null,
      approvedById: null,
      approvedAt: null,
      ...(toReview ? { status: "UnderReview" } : {}),
    },
  });

  await recordAudit(
    id,
    user,
    "approval_revoked",
    toReview
      ? "Approval withdrawn · status → Under review"
      : "Approval withdrawn",
  );
  revalidate(id);
  return { ok: true };
}
