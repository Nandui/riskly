-- Additive only (shared dev==prod Neon DB; forward-only).
-- Structured investigation findings: a root-cause class + analysis, and the
-- investigation's conclusion. All nullable; existing incidents are unaffected.

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "rootCauseCategory" TEXT,
ADD COLUMN     "rootCause" TEXT,
ADD COLUMN     "investigationConclusion" TEXT;
