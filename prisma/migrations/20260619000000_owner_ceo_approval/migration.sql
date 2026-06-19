-- Owner + CEO approvals. The existing single approval columns (approvedByName,
-- approvedById, approvedAt) are kept and mapped to the CEO approval in Prisma,
-- so prior sign-offs carry over as CEO approvals. Add the owner approval here.
ALTER TABLE "RiskAssessment" ADD COLUMN     "ownerApprovedByName" TEXT,
ADD COLUMN     "ownerApprovedById" TEXT,
ADD COLUMN     "ownerApprovedAt" TIMESTAMP(3);

ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_ownerApprovedById_fkey" FOREIGN KEY ("ownerApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
