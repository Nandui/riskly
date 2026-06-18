-- Make an assessment's audit trail survive deletion: orphan the rows
-- (assessmentId -> NULL) instead of cascading, and keep a denormalised
-- reference so deleted assessments stay identifiable for audit.

ALTER TABLE "AuditLog" ADD COLUMN "assessmentRef" TEXT;

UPDATE "AuditLog" a
SET "assessmentRef" = r."reference"
FROM "RiskAssessment" r
WHERE a."assessmentId" = r."id";

ALTER TABLE "AuditLog" ALTER COLUMN "assessmentId" DROP NOT NULL;

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_assessmentId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "RiskAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
