# Changelog

All notable changes to Riskly. The project uses alpha versioning; releases are
tagged `vX.Y.Z-alpha`.

## [0.5.0] — 2026-06-20 (Alpha)

### AI hazard drafting

- Major reliability overhaul. Drafting now generates plain text and parses the
  JSON itself — tolerating fenced, preambled, bare-array or comma-separated
  replies and dropping a single malformed item rather than failing the whole
  batch — retries transient failures (timeouts, network, 429, 5xx) with
  backoff, and runs under a fixed time budget so it can never hang the request.
- Default model is now **Google Gemini 2.5 Flash** with "thinking" disabled for
  speed; still overridable via `RISKLY_AI_MODEL`.
- Each hazard's controls are normalised to one per line, whatever shape the
  model returns.

### Assessments

- One assessment per **role** and **activity**, mirroring areas — an
  already-assessed subject is disabled in the picker and duplicates are blocked.
- **Duplicate** an assessment to another centre/subject: opens the
  new-assessment form pre-filled with the source's hazards, scope and review
  cadence (as a fresh Draft).
- **Copy** selected hazards from one assessment into any other existing
  assessment, in any centre.
- The assessments list now shows each assessment's total **hazard count** in
  place of the high-risk count.

### Governance & workflow

- Confirmation dialogs before any action that changes an assessment's overall
  state — granting an approval, or editing/adding/deleting a hazard (or saving
  edits) on an already-approved assessment.
- Review requests resolve through a proper flow: **Action**/**Dismiss** opens a
  dialog for a resolution note (required when dismissing), confirms with
  feedback, and records the note on the request and in the activity log.

### UI

- Removed the global top bar and ⌘K command palette. The Assessments page keeps
  its own full-text search, and "New assessment" lives there and on the
  dashboard.

## [0.3.5] — 2026-06-19 (Alpha)

### AI hazard drafting

- Top up existing assessments — draft additional hazards that complement what's
  already there, with duplicate detection.
- Choose exactly how many hazards to draft, or leave on Auto.
- Default model is now DeepSeek V3.1, with hardened output handling: clear AI
  Gateway error messages, JSON repair for fenced/unwrapped responses, and
  tolerant schema parsing.

### Approvals & governance

- Two-tier sign-off: **Owner** approval + **CEO** approval, with a new **CEO**
  role.
- Separation of duties — an assessment's owner can't grant its CEO approval.
- Either approval puts an assessment in force; redesigned approval card with
  clear Owner/CEO slots.
- Withdrawing an approval now requires a reason, recorded in the activity log.

### Hazards

- Standardised "Persons at risk" to a fixed set (Staff, Customers, Children,
  Contractors, Visitors), with a one-off data backfill.
- Per-hazard quick **edit** and **delete** from the assessment page, both
  audited.
- Removed the decorative hazard index badges.

### Reporting & UI

- Print now produces a formal, paper-ready risk assessment report instead of a
  screenshot of the page.
- Consolidated the Reference page into Assessments; clicking an assessment opens
  the full page.
- Refreshed the risk summary card and distribution visuals.

## [0.3.0] — Alpha

Earlier alpha release (tag `v0.3.0-alpha`).

## [0.2.0] — Alpha

Earlier alpha release (tag `v0.2.0-alpha`).

## [0.1.0] — Alpha

Initial alpha release (tag `v0.1.0-alpha`).

[0.5.0]: https://github.com/nandui/riskly/releases/tag/v0.5.0-alpha
[0.3.5]: https://github.com/nandui/riskly/releases/tag/v0.3.5-alpha
[0.3.0]: https://github.com/nandui/riskly/releases/tag/v0.3.0-alpha
[0.2.0]: https://github.com/nandui/riskly/releases/tag/v0.2.0-alpha
[0.1.0]: https://github.com/nandui/riskly/releases/tag/v0.1.0-alpha
