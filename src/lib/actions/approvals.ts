"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form";

function revalidate(id: string) {
  revalidatePath(`/assessments/${id}`);
  revalidatePath("/assessments");
  revalidatePath("/monitoring");
  revalidatePath("/");
}

type Kind = "owner" | "ceo";
const KIND_LABEL: Record<Kind, string> = { owner: "Owner", ceo: "CEO" };

// Owner sign-off is granted by the assessment's owner; CEO sign-off by a CEO.
// Admins can grant either.
function mayApprove(
  user: { id: string; role: string } | null | undefined,
  kind: Kind,
  ownerId: string | null,
): boolean {
  if (!user) return false;
  if (can(user, "admin")) return true;
  if (kind === "owner") return ownerId != null && user.id === ownerId;
  return user.role === "CEO";
}

// Grant the Owner or CEO sign-off. Either approval puts the assessment in force
// (Active), per the agreed model.
export async function grantApproval(id: string, kind: Kind): Promise<FormState> {
  const user = await getCurrentUser();
  const a = await db.riskAssessment.findUnique({
    where: { id },
    select: { status: true, ownerId: true },
  });
  if (!a) return { ok: false, error: "Assessment not found." };
  if (!mayApprove(user, kind, a.ownerId)) {
    return {
      ok: false,
      error: `You don't have permission to grant the ${KIND_LABEL[kind]} approval.`,
    };
  }

  const name = user!.name ?? user!.email ?? "Unknown";
  const toActive = a.status !== "Active" && a.status !== "Archived";
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

  await db.riskAssessment.update({
    where: { id },
    data: { ...data, ...(toActive ? { status: "Active" } : {}) },
  });

  await recordAudit(
    id,
    user,
    "approved",
    `${KIND_LABEL[kind]} approval by ${name}${toActive ? " · status → Active" : ""}`,
  );
  revalidate(id);
  return { ok: true };
}

// Withdraw the Owner or CEO sign-off. The assessment stays Active while the
// other approval remains; once neither is left it goes back to Under review.
export async function withdrawApproval(
  id: string,
  kind: Kind,
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
  const otherApproved =
    kind === "owner"
      ? Boolean(a.ceoApprovedByName)
      : Boolean(a.ownerApprovedByName);
  const toReview = !otherApproved && a.status !== "Archived";

  await db.riskAssessment.update({
    where: { id },
    data: { ...data, ...(toReview ? { status: "UnderReview" } : {}) },
  });

  await recordAudit(
    id,
    user,
    "approval_revoked",
    `${KIND_LABEL[kind]} approval withdrawn${toReview ? " · status → Under review" : ""}`,
  );
  revalidate(id);
  return { ok: true };
}
