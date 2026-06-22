-- Additive only (shared dev==prod Neon DB; forward-only).
-- Assign follow-up actions and evidence/info requests to real app users.
-- The denormalised `assignedTo` name column is kept for display + back-compat;
-- new writes set both the FK and the name.

-- AlterTable
ALTER TABLE "FollowUpAction" ADD COLUMN     "assignedToId" TEXT;

-- AlterTable
ALTER TABLE "EvidenceRequest" ADD COLUMN     "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "FollowUpAction_assignedToId_idx" ON "FollowUpAction"("assignedToId");

-- CreateIndex
CREATE INDEX "EvidenceRequest_assignedToId_idx" ON "EvidenceRequest"("assignedToId");

-- AddForeignKey
ALTER TABLE "FollowUpAction" ADD CONSTRAINT "FollowUpAction_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRequest" ADD CONSTRAINT "EvidenceRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
