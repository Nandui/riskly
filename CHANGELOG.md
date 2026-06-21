# Changelog

All notable changes to Riskly. The project uses alpha versioning; releases are
tagged `vX.Y.Z-alpha`.

## [Unreleased]

### Roles (Centrely role set)

Replaced the old roles with the Centrely set — **Operations Manager**, **CEO**,
**Duty Manager**, **Department Supervisor**, **Shift Supervisor** — and moved
permissions from a strict hierarchy to an explicit capability matrix:

- **Shift Supervisor** — view risk assessments & incidents; submit incidents.
- **Duty Manager / Department Supervisor** — the above, plus request assessment
  & hazard reviews and manage an incident's follow-up actions / people.
- **CEO** — view everything, grant the CEO sign-off, and raise assessment
  review requests; views incidents only (cannot change them). Monitoring shows
  the CEO a count + list of assessments awaiting their approval and the state of
  the review requests they've raised.
- **Operations Manager** — full admin; sees every option, current and future.

Existing users are remapped by a migration (Admin/Assessor → Operations Manager,
Reviewer/Contributor → Duty Manager, Viewer → Shift Supervisor; CEO unchanged).

### Incidents module (new)

Riskly is now two modules under one shell. Alongside risk assessments, a new
**Incidents** module covers incident reporting and the investigation workflow:

- **Report incidents** — accidents, near misses, property damage, aggression,
  hazardous substances, fire/evacuation and more, with severity (reusing the
  risk palette), a date/time, and a precise location. Save as a **draft** or
  submit.
- **People involved** — record injured parties (injury, body part, treatment,
  lost time) and witness statements.
- **Investigation workflow** — Draft → Open → Under investigation → Closed,
  with **follow-up actions** that track open/in-progress/complete and flip to
  **overdue** automatically. Closing requires every action complete.
- **Incident dashboard** — KPIs, "needs attention" (overdue actions + open
  reportable incidents), trend/type/severity charts and recent incidents.
- **PDF export** — a clean incident report for insurance or records.
- **Locations** — incidents reuse each centre's existing **Areas** plus a new
  **Sub-area** level, managed under **Admin → Locations**.
- Sidebar grouped into **Risk assessments** and **Incidents** sections.
- Permissions reuse Riskly's roles: anyone can view; **Contributor+** report &
  manage; **Reviewer+** investigate & close; **Admin** deletes & manages
  locations.

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
