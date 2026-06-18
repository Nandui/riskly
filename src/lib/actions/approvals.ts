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
}

// Sign-off action: anyone who can review can approve. Records the approver's
// name + time on the assessment and an audit entry.
export async function approveAssessment(id: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user, "review")) {
    return { ok: false, error: "You don't have permission to approve." };
  }
  const name = user.name ?? user.email ?? "Unknown";
  await db.riskAssessment.update({
    where: { id },
    data: {
      approvedByName: name,
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });
  await recordAudit(id, user, "approved", `Approved by ${name}`);
  revalidate(id);
  return { ok: true };
}

export async function revokeApproval(id: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !can(user, "review")) {
    return { ok: false, error: "You don't have permission to do this." };
  }
  await db.riskAssessment.update({
    where: { id },
    data: { approvedByName: null, approvedById: null, approvedAt: null },
  });
  await recordAudit(id, user, "approval_revoked", "Approval withdrawn");
  revalidate(id);
  return { ok: true };
}
