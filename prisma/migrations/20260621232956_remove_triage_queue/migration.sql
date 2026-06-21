-- Triage queue removed: incidents now open immediately on submit. Move any
-- records still sitting in the retired "AwaitingTriage" status to "Open" so
-- none are stranded in a status whose workflow no longer exists.
-- Data-only (no schema change) — the triage columns are intentionally retained.
UPDATE "Incident" SET "status" = 'Open' WHERE "status" = 'AwaitingTriage';
