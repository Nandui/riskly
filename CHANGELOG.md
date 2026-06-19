# Changelog

All notable changes to Riskly. The project uses alpha versioning; releases are
tagged `vX.Y.Z-alpha`.

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

[0.3.5]: https://github.com/nandui/riskly/releases/tag/v0.3.5-alpha
[0.3.0]: https://github.com/nandui/riskly/releases/tag/v0.3.0-alpha
[0.2.0]: https://github.com/nandui/riskly/releases/tag/v0.2.0-alpha
[0.1.0]: https://github.com/nandui/riskly/releases/tag/v0.1.0-alpha
