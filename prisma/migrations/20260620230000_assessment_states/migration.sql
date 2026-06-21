-- Assessment lifecycle change: the in-force status "Active" becomes "Approved",
-- and Approved now requires BOTH the Owner and the CEO sign-off.

-- 1. Rename Active -> Approved.
UPDATE "RiskAssessment" SET "status" = 'Approved' WHERE "status" = 'Active';

-- 2. Anything Approved without both sign-offs goes back to Under review.
--    (The CEO sign-off name is stored in the column "approvedByName".)
UPDATE "RiskAssessment" SET "status" = 'UnderReview'
  WHERE "status" = 'Approved'
    AND ("ownerApprovedByName" IS NULL OR "approvedByName" IS NULL);

-- 3. Approved assessments already past their next review date are Under review
--    (the app also refreshes this on read).
UPDATE "RiskAssessment" SET "status" = 'UnderReview'
  WHERE "status" = 'Approved' AND "nextReviewDate" < CURRENT_DATE;
