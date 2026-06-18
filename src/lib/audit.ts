import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";

export type AuditAction =
  | "created"
  | "updated"
  | "hazard_added"
  | "imported"
  | "approved"
  | "approval_revoked"
  | "review_logged"
  | "review_requested"
  | "review_request_resolved"
  | "deleted";

// Append an entry to an assessment's activity log. userName is denormalised so
// the history stays readable even if the user is later removed.
export async function recordAudit(
  assessmentId: string,
  user: Pick<CurrentUser, "id" | "name" | "email"> | null,
  action: AuditAction,
  detail?: string | null,
): Promise<void> {
  // Denormalise the assessment reference so the entry stays identifiable even
  // after the assessment is deleted (the FK is set null, not cascaded).
  const ref = await db.riskAssessment.findUnique({
    where: { id: assessmentId },
    select: { reference: true },
  });
  await db.auditLog.create({
    data: {
      assessmentId,
      assessmentRef: ref?.reference ?? null,
      userId: user?.id ?? null,
      userName: user?.name ?? user?.email ?? null,
      action,
      detail: detail ?? null,
    },
  });
}
