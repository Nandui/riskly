-- Per-hazard permanent reference number (RA-{SITE}-{NNNN}-HZ-{NNN}).
-- seq is assigned once and never reused; hazardSeq is the per-assessment
-- high-water mark used to allocate the next seq.

-- 1. Hazard.seq — add nullable, backfill in current order per assessment, enforce.
ALTER TABLE "Hazard" ADD COLUMN "seq" INTEGER;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "assessmentId"
      ORDER BY "sortOrder" ASC, "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "Hazard"
)
UPDATE "Hazard" h
SET "seq" = n.rn
FROM numbered n
WHERE h."id" = n."id";

ALTER TABLE "Hazard" ALTER COLUMN "seq" SET NOT NULL;

CREATE UNIQUE INDEX "Hazard_assessmentId_seq_key" ON "Hazard"("assessmentId", "seq");

-- 2. RiskAssessment.hazardSeq — high-water mark = current max hazard seq.
ALTER TABLE "RiskAssessment" ADD COLUMN "hazardSeq" INTEGER NOT NULL DEFAULT 0;

UPDATE "RiskAssessment" ra
SET "hazardSeq" = COALESCE(
  (SELECT MAX(h."seq") FROM "Hazard" h WHERE h."assessmentId" = ra."id"),
  0
);
