-- When the (migrated) CEO approval was granted by the assessment's own owner,
-- it was really an owner sign-off. Move it into the owner approval so the CEO
-- slot is left for a separate CEO — separation of duties. Approvals by anyone
-- other than the owner (or with no recorded user id, e.g. seed data) stay as
-- CEO approvals.
UPDATE "RiskAssessment"
SET "ownerApprovedByName" = "approvedByName",
    "ownerApprovedById"   = "approvedById",
    "ownerApprovedAt"     = "approvedAt",
    "approvedByName" = NULL,
    "approvedById"   = NULL,
    "approvedAt"     = NULL
WHERE "approvedById" IS NOT NULL
  AND "approvedById" = "ownerId"
  AND "ownerApprovedById" IS NULL;
