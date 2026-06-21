-- Switch to the Centrely role set. Remap any existing users from the old roles
-- (Viewer/Contributor/Reviewer/Assessor/Admin) to the closest new role so no
-- account is left with an unrecognised role, then update the column default.
UPDATE "User" SET "role" = CASE "role"
    WHEN 'Admin' THEN 'Operations Manager'
    WHEN 'Assessor' THEN 'Operations Manager'
    WHEN 'Reviewer' THEN 'Duty Manager'
    WHEN 'Contributor' THEN 'Duty Manager'
    WHEN 'Viewer' THEN 'Shift Supervisor'
    ELSE "role" -- 'CEO' and any already-migrated values are left unchanged
END;

-- AlterColumn default
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'Shift Supervisor';
