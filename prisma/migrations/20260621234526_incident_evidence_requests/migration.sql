-- Additive only (shared dev==prod Neon DB; forward-only).

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "investigationNotes" TEXT;

-- CreateTable
CREATE TABLE "EvidenceRequest" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT,
    "timeWindow" TEXT,
    "detail" TEXT,
    "assignedTo" TEXT,
    "retentionDeadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "outcomeRef" TEXT,
    "requestedBy" TEXT,
    "requestedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceRequest_incidentId_idx" ON "EvidenceRequest"("incidentId");

-- CreateIndex
CREATE INDEX "EvidenceRequest_status_idx" ON "EvidenceRequest"("status");

-- AddForeignKey
ALTER TABLE "EvidenceRequest" ADD CONSTRAINT "EvidenceRequest_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
