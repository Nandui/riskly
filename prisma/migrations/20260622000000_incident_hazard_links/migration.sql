-- Additive only (shared dev==prod Neon DB; forward-only).

-- CreateTable
CREATE TABLE "IncidentHazardLink" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "hazardId" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentHazardLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentHazardLink_incidentId_idx" ON "IncidentHazardLink"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentHazardLink_hazardId_idx" ON "IncidentHazardLink"("hazardId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentHazardLink_incidentId_hazardId_key" ON "IncidentHazardLink"("incidentId", "hazardId");

-- AddForeignKey
ALTER TABLE "IncidentHazardLink" ADD CONSTRAINT "IncidentHazardLink_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentHazardLink" ADD CONSTRAINT "IncidentHazardLink_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "Hazard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
