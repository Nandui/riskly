"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { liveStatus } from "@/lib/approval";
import type { FormState } from "@/lib/form";

function revalidate(id: string) {
  revalidatePath(`/assessments/${id}`);
  revalidatePath("/assessments");
  revalidatePath("/monitoring");
  revalidatePath("/");
}

type Kind = "owner" | "ceo";
const KIND_LABEL: Record<Kind, string> = { owner: "Owner", ceo: "CEO" };

// Owner sign-off is the owner's own attestation; CEO sign-off must be a
// *different* person (separation of duties) — a CEO, or an Admin acting as
// exec, who is not the owner.
function mayApprove(
  user: { id: string; role: string } | null | undefined,
  kind: Kind,
  ownerId: string | null,
): boolean {
  if (!user) return false;
  const isOwner = ownerId != null && user.id === ownerId;
  if (kind === "owner") return isOwner;
  return !isOwner && can(user, "approveAssessments");
}

// Grant the Owner or CEO sign-off. An assessment is Approved only once BOTH
// sign-offs are present (and it isn't overdue); a single sign-off leaves it
// Under review.
export async function grantApproval(id: string, kind: Kind): Promise<FormState> {
  const user = await getCurrentUser();
  const a = await db.riskAssessment.findUnique({
    where: { id },
    select: {
      status: true,
      ownerId: true,
      ownerApprovedByName: true,
      ceoApprovedByName: true,
      nextReviewDate: true,
    },
  });
  if (!a) return { ok: false, error: "Assessment not found." };
  if (!mayApprove(user, kind, a.ownerId)) {
    return {
      ok: false,
      error: `You don't have permission to grant the ${KIND_LABEL[kind]} approval.`,
    };
  }

  const name = user!.name ?? user!.email ?? "Unknown";
  const data =
    kind === "owner"
      ? {
          ownerApprovedByName: name,
          ownerApprovedById: user!.id,
          ownerApprovedAt: new Date(),
        }
      : {
          ceoApprovedByName: name,
          ceoApprovedById: user!.id,
          ceoApprovedAt: new Date(),
        };

  // Recompute the live status from both sign-offs (archived stays archived).
  const nextStatus =
    a.status === "Archived"
      ? a.status
      : liveStatus({
          ownerApprovedByName:
            kind === "owner" ? name : a.ownerApprovedByName,
          ceoApprovedByName: kind === "ceo" ? name : a.ceoApprovedByName,
          nextReviewDate: a.nextReviewDate,
        });

  await db.riskAssessment.update({
    where: { id },
    data: { ...data, status: nextStatus },
  });

  await recordAudit(
    id,
    user,
    "approved",
    `${KIND_LABEL[kind]} approval by ${name}${nextStatus === "Approved" ? " · status → Approved" : ""}`,
  );
  revalidate(id);
  return { ok: true };
}

// Withdraw the Owner or CEO sign-off. Since Approved requires both, removing
// either one sends the assessment back to Under review.
export async function withdrawApproval(
  id: string,
  kind: Kind,
  reason: string,
): Promise<FormState> {
  const user = await getCurrentUser();
  const a = await db.riskAssessment.findUnique({
    where: { id },
    select: {
      status: true,
      ownerId: true,
      ownerApprovedByName: true,
      ceoApprovedByName: true,
    },
  });
  if (!a) return { ok: false, error: "Assessment not found." };
  if (!mayApprove(user, kind, a.ownerId)) {
    return {
      ok: false,
      error: `You don't have permission to withdraw the ${KIND_LABEL[kind]} approval.`,
    };
  }

  const note = (reason ?? "").trim().slice(0, 500);
  if (!note) {
    return { ok: false, error: "Give a reason for withdrawing the approval." };
  }

  const data =
    kind === "owner"
      ? {
          ownerApprovedByName: null,
          ownerApprovedById: null,
          ownerApprovedAt: null,
        }
      : {
          ceoApprovedByName: null,
          ceoApprovedById: null,
          ceoApprovedAt: null,
        };
  // With both sign-offs required to be Approved, removing either one always
  // sends it back to Under review (unless it's archived).
  const toReview = a.status !== "Archived";

  await db.riskAssessment.update({
    where: { id },
    data: { ...data, ...(toReview ? { status: "UnderReview" } : {}) },
  });

  await recordAudit(
    id,
    user,
    "approval_revoked",
    `${KIND_LABEL[kind]} approval withdrawn — ${note}${toReview ? " · status → Under review" : ""}`,
  );
  revalidate(id);
  return { ok: true };
}
