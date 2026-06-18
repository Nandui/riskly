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
  | "review_request_resolved";

// Append an entry to an assessment's activity log. userName is denormalised so
// the history stays readable even if the user is later removed.
export async function recordAudit(
  assessmentId: string,
  user: Pick<CurrentUser, "id" | "name" | "email"> | null,
  action: AuditAction,
  detail?: string | null,
): Promise<void> {
  await db.auditLog.create({
    data: {
      assessmentId,
      userId: user?.id ?? null,
      userName: user?.name ?? user?.email ?? null,
      action,
      detail: detail ?? null,
    },
  });
}
