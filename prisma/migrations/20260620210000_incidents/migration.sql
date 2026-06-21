-- CreateTable
CREATE TABLE "SubArea" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "severity" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "areaId" TEXT,
    "subAreaId" TEXT,
    "location" TEXT NOT NULL,
    "locationDetail" TEXT,
    "description" TEXT NOT NULL,
    "immediateAction" TEXT,
    "reportedBy" TEXT NOT NULL,
    "reportedById" TEXT,
    "witnessCount" INTEGER NOT NULL DEFAULT 0,
    "injuredCount" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closureNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Witness" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleOrRelation" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "statement" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Witness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InjuredParty" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "address" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "injuryNature" TEXT NOT NULL,
    "bodyPartAffected" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "hospitalName" TEXT,
    "gpReferral" BOOLEAN NOT NULL DEFAULT false,
    "lostTime" BOOLEAN NOT NULL DEFAULT false,
    "lostTimeDays" INTEGER,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InjuredParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpAction" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubArea_areaId_idx" ON "SubArea"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_reference_key" ON "Incident"("reference");

-- CreateIndex
CREATE INDEX "Incident_centerId_idx" ON "Incident"("centerId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");

-- CreateIndex
CREATE INDEX "Incident_occurredAt_idx" ON "Incident"("occurredAt");

-- CreateIndex
CREATE INDEX "Incident_areaId_idx" ON "Incident"("areaId");

-- CreateIndex
CREATE INDEX "Incident_subAreaId_idx" ON "Incident"("subAreaId");

-- CreateIndex
CREATE INDEX "Witness_incidentId_idx" ON "Witness"("incidentId");

-- CreateIndex
CREATE INDEX "InjuredParty_incidentId_idx" ON "InjuredParty"("incidentId");

-- CreateIndex
CREATE INDEX "FollowUpAction_incidentId_idx" ON "FollowUpAction"("incidentId");

-- CreateIndex
CREATE INDEX "FollowUpAction_status_idx" ON "FollowUpAction"("status");

-- CreateIndex
CREATE INDEX "FollowUpAction_dueDate_idx" ON "FollowUpAction"("dueDate");

-- AddForeignKey
ALTER TABLE "SubArea" ADD CONSTRAINT "SubArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_subAreaId_fkey" FOREIGN KEY ("subAreaId") REFERENCES "SubArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjuredParty" ADD CONSTRAINT "InjuredParty_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAction" ADD CONSTRAINT "FollowUpAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
