# Changelog

All notable changes to Riskly. The project uses alpha versioning; releases are
tagged `vX.Y.Z-alpha`.

## [Unreleased]

### Incidents — investigation redesign (in progress)

A ground-up rework of the incident reporting + investigation experience. First
slice:

- **Work is assigned to real users.** Follow-up actions and evidence/info
  requests are now assigned to an app user (a proper user link, not a typed
  name), so the **For You** inbox surfaces them reliably by who you are rather
  than by name matching. The assignee's display name is still stored for lists,
  exports and historical rows.
- **Requests assigned to you** now appear on the **For You** home alongside your
  follow-up actions, with a "pull the footage before it's gone" deadline cue for
  outstanding CCTV.
- **Reworked investigation workspace.** The incident page now splits cleanly into
  a **Record** half (what happened, type detail, people) and an **Investigation**
  half (evidence/info requests, follow-up actions, related hazards, working log),
  with a new **Investigation summary** in the rail — open requests, open/overdue
  actions, related hazards, and who currently owns the outstanding work.

### Incidents — related hazards

- **Link hazards to an incident during investigation.** The incident workspace
  has a new **Related hazards** card. Investigators pick the hazards (from the
  centre's risk assessments) that relate to the incident, choosing from a
  picker that **filters by area** and defaults to the area where the incident
  happened — so "the hazards for this area" are one click away. Selecting saves
  the whole set (adding and removing links in one go); individual hazards can be
  unlinked from the card.
- Each linked hazard shows its risk score/band, category and reference, and
  links straight through to its assessment. Linked hazards are included in the
  incident **PDF export**.

## [0.6.0] — 2026-06-21 (Alpha)

### Assessment lifecycle

Assessment status is now derived from approval + review date rather than set by
hand:

- **Draft** — being written; no review schedule/due date.
- **Under review** — submitted but not fully signed off, or past its next review
  date (an overdue Approved assessment flips back automatically on read).
- **Approved** — signed off by **both** the Owner and the CEO and in date
  (replaces the old "Active"; either sign-off alone is no longer enough).
- **Archived** — retired.

The assessment form and importer no longer let you pick "Approved" — it's earned
via the two sign-offs; withdrawing either sign-off (or editing the content)
returns it to Under review, and logging a review re-validates a fully-signed
assessment back to Approved.

Only an Approved assessment carries a next-review date — Draft, Under review and
Archived read as "Not scheduled" (the review schedule only applies once it's in
force). Monitoring drops the now-redundant "Overdue reviews" stat (overdue
assessments simply become Under review).

### Home & navigation

- New **For you** home (`/`) — the first thing you see on login. A personal,
  cross-module inbox of what's waiting on you: assessments awaiting your CEO
  sign-off, assessments you own that are back under review, incident follow-up
  actions assigned to you, your unfinished incident drafts, and the state of the
  review requests you've raised — plus quick actions (report an incident, new
  assessment). Shows an "all caught up" state when nothing needs you.
- **Monitoring** is now an org-wide **awareness** view: reviews coming due,
  what's under review, high & very high risk, and open review requests (personal
  items moved to *For you*).
- The risk dashboard (charts + risk matrix) moved to **Overview** (`/overview`)
  under Risk assessments — a "risk ratios & highlights" glance.

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

[0.6.0]: https://github.com/nandui/riskly/releases/tag/v0.6.0-alpha
[0.5.0]: https://github.com/nandui/riskly/releases/tag/v0.5.0-alpha
[0.3.5]: https://github.com/nandui/riskly/releases/tag/v0.3.5-alpha
[0.3.0]: https://github.com/nandui/riskly/releases/tag/v0.3.0-alpha
[0.2.0]: https://github.com/nandui/riskly/releases/tag/v0.2.0-alpha
[0.1.0]: https://github.com/nandui/riskly/releases/tag/v0.1.0-alpha
