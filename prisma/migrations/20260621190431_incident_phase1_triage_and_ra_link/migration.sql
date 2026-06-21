-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "definedDoType" BOOLEAN,
ADD COLUMN     "hazardCategory" TEXT,
ADD COLUMN     "potentialConsequence" INTEGER,
ADD COLUMN     "potentialLikelihood" INTEGER,
ADD COLUMN     "reportedAt" TIMESTAMP(3),
ADD COLUMN     "triageStatus" TEXT,
ADD COLUMN     "triagedAt" TIMESTAMP(3),
ADD COLUMN     "triagedBy" TEXT;

-- AlterTable
ALTER TABLE "ReviewRequest" ADD COLUMN     "sourceIncidentId" TEXT;

-- CreateTable
CREATE TABLE "IncidentRiskAssessmentLink" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "reviewRequestId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentRiskAssessmentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentRiskAssessmentLink_incidentId_idx" ON "IncidentRiskAssessmentLink"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentRiskAssessmentLink_assessmentId_idx" ON "IncidentRiskAssessmentLink"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentRiskAssessmentLink_incidentId_assessmentId_linkType_key" ON "IncidentRiskAssessmentLink"("incidentId", "assessmentId", "linkType");

-- CreateIndex
CREATE INDEX "Incident_triageStatus_idx" ON "Incident"("triageStatus");

-- CreateIndex
CREATE INDEX "Incident_reportedAt_idx" ON "Incident"("reportedAt");

-- AddForeignKey
ALTER TABLE "IncidentRiskAssessmentLink" ADD CONSTRAINT "IncidentRiskAssessmentLink_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRiskAssessmentLink" ADD CONSTRAINT "IncidentRiskAssessmentLink_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "RiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
