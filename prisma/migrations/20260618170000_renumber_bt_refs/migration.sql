-- One-time data fix: renumber Bishopstown (BT) assessment references so they
-- run sequentially from RA-BT-0001 again. A test assessment had been deleted,
-- leaving the lowest reference at 0002. Two passes through a temporary prefix
-- avoid the unique-reference collision; ordering by createdAt keeps the
-- existing assessments in their original order.

-- Pass 1 → temporary references
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "RiskAssessment"
  WHERE reference LIKE 'RA-BT-%'
)
UPDATE "RiskAssessment" t
SET reference = 'RA-BT-TMP-' || ranked.rn
FROM ranked
WHERE t.id = ranked.id;

-- Pass 2 → final RA-BT-000N references
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "RiskAssessment"
  WHERE reference LIKE 'RA-BT-TMP-%'
)
UPDATE "RiskAssessment" t
SET reference = 'RA-BT-' || LPAD(ranked.rn::text, 4, '0')
FROM ranked
WHERE t.id = ranked.id;
