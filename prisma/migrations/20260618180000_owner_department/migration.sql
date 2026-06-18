-- Department library (org-level, shared across centres)
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- Owner (single user) + department on each assessment
ALTER TABLE "RiskAssessment" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "RiskAssessment" ADD COLUMN "departmentId" TEXT;

CREATE INDEX "RiskAssessment_ownerId_idx" ON "RiskAssessment"("ownerId");
CREATE INDEX "RiskAssessment_departmentId_idx" ON "RiskAssessment"("departmentId");

ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Carry an existing assignee over as the owner (best effort), then drop the
-- multi-person assignees relation — owner replaces it.
UPDATE "RiskAssessment" r SET "ownerId" = j."B"
FROM "_Assignees" j
WHERE j."A" = r."id" AND r."ownerId" IS NULL;

DROP TABLE "_Assignees";
