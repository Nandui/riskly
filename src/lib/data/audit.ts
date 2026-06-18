import { db } from "@/lib/db";

// The recorded audit trail, newest first. Orphaned rows (assessmentId = null)
// are the history of deleted assessments, kept via the denormalised reference.
export async function listAuditLog(
  opts: { deletedOnly?: boolean; limit?: number } = {},
) {
  const rows = await db.auditLog.findMany({
    where: opts.deletedOnly ? { assessmentId: null } : {},
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 300,
    include: { assessment: { select: { id: true, reference: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    detail: r.detail,
    userName: r.userName,
    createdAt: r.createdAt,
    assessmentId: r.assessmentId,
    reference: r.assessment?.reference ?? r.assessmentRef ?? null,
    deleted: r.assessmentId === null,
  }));
}

export async function countDeletedAuditEntries(): Promise<number> {
  return db.auditLog.count({ where: { assessmentId: null } });
}
