# Incidents — Phase 1 Implementation Plan

> **Implementation status (built on branch `feat/incidents-phase1`).** Done: the additive migration (applied to the shared Neon DB); constants + validation; `reportedAt` + Near-miss/DO submit-routing to `AwaitingTriage`; the `triageIncident` action + triage screen (`/incidents/[id]/triage`) with the dual-severity 5×5 reusing `risk.ts`; the passive triage queue (`/incidents/triage`) + dashboard "Awaiting triage" panel + report-gap stat + sidebar nav; the 3-outcome close-out (`IncidentRiskAssessmentLink` join, `ReviewRequest.sourceIncidentId`, seeded Draft RA); registry-gated injured/witness sections on both the create form and detail page; the triaged potential-risk band + report-gap on the detail page. Verified: `tsc --noEmit` clean, `next build` green (both new routes registered), dev server serves all routes with no errors.
> **Pragmatically deferred (functionally covered, UX polish outstanding):** the full mobile **stepped wizard**, the **type-tile picker**, and the **"was anyone hurt?" outcome-tap** — intake still uses the existing Type/Severity selects (severity is provisional and confirmed at triage, so the slice works end-to-end). The **authenticated click-through** (login → file → triage → close) was **not** run — no test credentials in this environment; correctness rests on the build/typecheck + the adversarial review.



**Goal:** prove the three-layer incident model (shared core → type module → triage/investigation) on **one non-sensitive event type, Near miss (+ Dangerous occurrence)**, end-to-end: capture → awaiting-triage queue → triage (dual severity) → investigate → close with the 3-outcome risk-assessment link.

**Hard constraint:** migrations run against the **shared prod Neon DB** (dev == prod, single `DATABASE_URL`). Everything here is **additive-only**: new nullable columns, new tables, new `String`-enum values, new indexes. No renames, no value-rewrites, no `DROP`/`ALTER COLUMN`. Because `type`/`status`/`severity` are plain `String` columns, new values (`DangerousOccurrence`, `AwaitingTriage`, hazard categories, link types) are **code-only — no migration**.

---

## 0. Locked decisions (reconciling the two sub-plan groups)

The drafting produced two incompatible designs in places; these are the resolutions, and they are load-bearing — lock them before writing any code.

| # | Decision | Resolution | Why |
|---|----------|-----------|-----|
| D1 | **RA-link model** | **First-class join table `IncidentRiskAssessmentLink`** (+ `ReviewRequest.sourceIncidentId` back-pointer). **Not** a scalar `Incident.riskAssessmentId` FK. | Agreed scope item 6 ("first-class join so reopen doesn't wipe it"); distinguishes outcome (b) `ControlFailureReview` vs (c) `SeededDraft`; supports multiple links; survives reopen because links are separate rows. |
| D2 | **Potential-risk consequence column** | `potentialConsequence Int?` — **nullable, NO `@default`**. Passed as the `severity` arg: `riskScore(potentialLikelihood, potentialConsequence)`. | `@default(1)` would silently score every legacy/un-triaged row as Low and corrupt the triage signal. NULL = "not yet rated". |
| D3 | **"Triaged by" column** | `triagedBy String?` (name string), mirroring existing `closedBy`. **Not** `triagedById`. | Matches the incident module's existing loose-link convention (no `closedById` exists today). |
| D4 | **Status lifecycle** | Add **only** `AwaitingTriage`. Lifecycle: `Draft → AwaitingTriage → Open → UnderInvestigation → Closed`. Triage flips status straight to **`Open`** and records the decision in `triageStatus='Triaged'`. **Drop** `Triaged`/`UnderTriage` as *main* status values. | One canonical machine. `AwaitingTriage` is the passive queue state; the triage decision is a sub-state, not a main status. |
| D5 | **Who routes to triage** | In Phase 1, **only `NearMiss` and `DangerousOccurrence`** submit into `AwaitingTriage`. All other types keep `submit → Open` (unchanged). | Routing *all* types into triage is a major scope expansion; the slice only needs the two new-flow types. |
| D6 | **`reportedAt` stamp** | Set at **submit time** (in both `submitDraft` and the `createIncident` submit intent), **not** at create time. | A draft created today and submitted next week must show the real event→report gap, not create-time. |
| D7 | **Module fields** | Capture `hazardCategory` + `definedDoType` **at triage** (part of the Near-miss/DO module), not at intake. | Keeps intake to ~30s; these are manager-confirmable facts. Columns must have a write path or be dropped — they get one via the triage form. |

**Open decision (needs product sign-off — see §8):** who can triage/close. Verified fact: `investigateIncidents` is held **only by Operations Manager (admin)** — *not* Duty Manager. So as-is, triage and close are admin-only.

---

## 1. Schema changes — the single additive migration

All on `prisma/schema.prisma`. Generate with `prisma migrate dev --name incident_phase1_triage_and_ra_link --create-only`, eyeball the SQL for **only** `ADD COLUMN` / `CREATE TABLE` / `CREATE INDEX`, then `prisma migrate deploy`.

### `Incident` — add 8 nullable columns + indexes
```prisma
  // --- Phase 1: shared-core report timestamp ---
  reportedAt           DateTime?  // set at SUBMIT; gap = reportedAt - occurredAt

  // --- Phase 1: dual severity (potential axis, set at TRIAGE only) ---
  potentialLikelihood  Int?       // 1-5, null until triaged
  potentialConsequence Int?       // 1-5 (passed as `severity` to risk.ts), null until triaged

  // --- Phase 1: triage tracking ---
  triagedAt            DateTime?
  triagedBy            String?    // loose name, no FK (mirrors closedBy)
  triageStatus         String?    // Unreviewed | Triaged | ReferredToRA (null => Unreviewed)

  // --- Phase 1: Near-miss / Dangerous-occurrence module ---
  hazardCategory       String?    // PascalCase value from HAZARD_CATEGORIES
  definedDoType        Boolean?   // is this a defined Dangerous Occurrence? null = N/A

  // relation back-ref for the join table (no column)
  riskAssessmentLinks  IncidentRiskAssessmentLink[]
```
Add to the `Incident` `@@index` block:
```prisma
  @@index([triageStatus])
  @@index([reportedAt])
```
> `status` keeps its `String` type; only the inline comment changes to `Draft | AwaitingTriage | Open | UnderInvestigation | Closed`. **No migration for the new status value.**

### New model `IncidentRiskAssessmentLink` (D1)
```prisma
model IncidentRiskAssessmentLink {
  id              String         @id @default(cuid())
  incidentId      String
  incident        Incident       @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  assessmentId    String
  assessment      RiskAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  linkType        String         // ControlFailureReview | SeededDraft
  reviewRequestId String?        // soft pointer to the ReviewRequest raised (outcome b)
  note            String?
  createdById     String?        // loose link to User.id, no FK
  createdAt       DateTime       @default(now())

  @@unique([incidentId, assessmentId, linkType])
  @@index([incidentId])
  @@index([assessmentId])
}
```

### `RiskAssessment` — relation back-ref only (free, additive)
```prisma
  incidentLinks IncidentRiskAssessmentLink[]
```

### `ReviewRequest` — back-pointer for outcome (b)
```prisma
  sourceIncidentId String? // incident whose close-out raised this review (no FK)
```

**Migration safety:** all `ADD COLUMN` are NULL-able (no `NOT NULL` without default); the new table starts empty; indexes on a small `Incident` table take a sub-second lock (if the table is ever large, split the index into its own migration and use `CREATE INDEX CONCURRENTLY`). Zero risk to existing rows.

---

## 2. Constants & validation (code-first — ship before any write)

### `src/lib/incidents/constants.ts`
- `INCIDENT_TYPES` / `INCIDENT_TYPE_META`: add `DangerousOccurrence` (label "Dangerous occurrence", **cool/cyan** pill — keep the green→red palette reserved for severity).
- `INCIDENT_STATUSES` / `INCIDENT_STATUS_META`: add **`AwaitingTriage`** (label "Awaiting triage", amber "waiting" hue, distinct from blue `Open`). Export `AWAITING_TRIAGE_STATUS = "AwaitingTriage"`. **Keep `AwaitingTriage` OUT of `ACTIVE_INCIDENT_STATUSES`** (it is pre-investigation).
- Add `RATINGS = [1,2,3,4,5] as const`.
- Add `HAZARD_CATEGORIES` (Slips / Manual handling / Machinery / Electrical / Water / Chemical / Fire-explosion / Other) + meta.
- Add `TRIAGE_STATUSES` (Unreviewed | Triaged | ReferredToRA) + meta.
- Add `LINK_TYPES = ["ControlFailureReview","SeededDraft"] as const`.
- Add `TRIAGE_AGE_RAG` buckets (e.g. `<24h` fresh→low token, `<72h` due→medium, `≥72h` overdue→high), reusing existing band token class strings. **Hour boundaries are a product choice** (see §8).
- Add `ACTUAL_OUTCOME = INCIDENT_SEVERITIES` (a presentation alias — the intake "outcome tap" maps onto the **existing** 4-level `severity`; no new column, no rewrite).

### `src/lib/incidents/validation.ts`
- Extend `incidentTypeEnum` with `"DangerousOccurrence"` (existing `incidentFull`/`Draft`/`Update` schemas inherit it).
- Add `reportedAt` acceptance to `incidentFullSchema`/`incidentDraftSchema` only (keep `incidentUpdateSchema` untouched).
- Add `ratingInt = z.coerce.number().int().min(1).max(5)`.
- Add `triageIncidentSchema`:
  ```ts
  z.object({
    incidentId: z.string().min(1),
    type: incidentTypeEnum,
    severity: severityEnum,                 // confirmed actual outcome
    potentialLikelihood: ratingInt,         // required at triage
    potentialConsequence: ratingInt,        // required at triage
    hazardCategory: optionalText(40),
    definedDangerousOccurrence: z.coerce.boolean().optional(),
  })
  ```
- Replace `closeIncidentSchema` with a **backward-compatible** 3-outcome shape (the live dialog posts only `incidentId`+`closureNotes`, so `closureOutcome` defaults to `NoAction` and the RA fields are optional):
  ```ts
  z.object({
    incidentId: z.string().min(1),
    closureNotes: z.string().trim().min(1, "Add a closing note").max(2000),
    closureOutcome: z.enum(["NoAction","LinkExisting","SpawnDraft"]).default("NoAction"),
    riskAssessmentId: z.string().min(1).optional(),
    reviewNotes: optionalText(2000),
  }).superRefine((v, ctx) => {
    if (v.closureOutcome === "LinkExisting" && !v.riskAssessmentId)
      ctx.addIssue({ path:["riskAssessmentId"], code:"custom", message:"Choose the assessment whose control failed." });
  })
  ```

---

## 3. Backend actions — `src/lib/actions/incidents.ts`

1. **`createIncident`** (additive only): parse `reportedAt`; for `NearMiss`/`DangerousOccurrence` submit intent set `status = "AwaitingTriage"` and stamp `reportedAt = new Date()`; other types unchanged (`Open`). Drafts stay `Draft` (no `reportedAt`). The JSON-child-array contract (`witnesses`/`injuredParties`/`followUpActions` via `parseJsonArray`) is untouched.
2. **`submitDraft`**: for `NearMiss`/`DangerousOccurrence` route to `AwaitingTriage` (else `Open`); stamp `reportedAt = new Date()` here (D6).
3. **`triageIncident(_prev, formData)`** — NEW. Guard `denyUnless("investigateIncidents")`. Parse `triageIncidentSchema`. Allow **only** from `status === "AwaitingTriage"`. Clamp ratings with `clampRating` (from `@/lib/risk`). One update: `status: "Open"`, `triageStatus: "Triaged"`, `type`, `severity`, `potentialLikelihood`, `potentialConsequence`, `hazardCategory`, `definedDoType`, `triagedAt: now`, `triagedBy: user.name ?? user.email`. `revalidateIncidents(id)`.
4. **`closeIncident`** — widen the existing narrow `findUnique` select to `{ status, reference, centerId, areaId, description, followUpActions:{select:{status:true}} }`. Keep the existing "all actions Complete" + closure-notes gates. Wrap close + outcome in `db.$transaction`:
   - **NoAction:** unchanged.
   - **LinkExisting (b):** require `can(user,"requestReview")`; verify the RA is in the **same centre**; create `ReviewRequest { assessmentId, requestedById: user.id, notes: reviewNotes || "Raised from incident close-out (<ref>) — linked control failed.", sourceIncidentId: incident.id }`; create `IncidentRiskAssessmentLink { incidentId, assessmentId, linkType:"ControlFailureReview", reviewRequestId, createdById }`; `recordAudit(assessmentId, user, "review_requested", "From incident <ref>")`.
   - **SpawnDraft (c):** require `can(user,"editContent")`; **require `incident.areaId`** (block with a friendly error if null — an Area RA needs an area); soft-check `findSubjectAssessment("Area", areaId)` and if one exists, **link to it as (b)** instead of creating a duplicate; otherwise create a Draft RA with **all required non-default fields**: `reference: <tx-safe nextReference(centerId)>`, `centerId`, `subjectType:"Area"`, `areaId`, `status:"Draft"`, `nextReviewDate: computeNextReviewDate(new Date(),12)`, `description: "Seeded from incident <ref>: …"`; create `IncidentRiskAssessmentLink { …, linkType:"SeededDraft" }`; `recordAudit(newRa.id, user, "created", "Seeded from incident <ref>")`.
   > **Reference-collision fix:** `nextReference` is **not** transaction-aware. Either inline a tx-aware `MAX(reference)` query inside the `$transaction`, or wrap the RA create in the same `MAX_REFERENCE_RETRIES` P2002 retry pattern `createIncident` uses. Do not call `nextReference` naively inside `$transaction`.
5. **`reopenIncident`**: leave untouched (it nulls only `closedAt`/`closedBy`/`closureNotes`). Links are separate rows, so the RA link survives reopen automatically.
6. **`src/lib/incidents/permissions.ts`**: add `canTriageIncidents = (u) => can(u, "investigateIncidents")` (no new capability).

---

## 4. Data layer

- **`src/lib/incidents/types.ts`**: `IncidentDetail` (= `Incident & {…}`) gains the new columns automatically after `prisma generate`. **Hand-add** `reportedAt`, `triageStatus`, `potentialLikelihood/Consequence` to the **hand-written** `IncidentListItem` and the `toListItem` mapper. Add `TriageQueueItem` and extend `IncidentDashboardStats`/`IncidentDashboardData` (`awaitingTriage`, `avgReportGapHours`, `awaitingTriageQueue`, `awaitingTriageTotal`).
- **`src/lib/data/incidents.ts`**: add `listAwaitingTriage(centerId?)` → incidents with `status === "AwaitingTriage"`, ordered by `COALESCE(reportedAt, createdAt)` asc (oldest-waiting first), computing `waitingSince` and `reportGapHours` (null when `reportedAt` null). Do **not** call `sweepOverdueActions` here.
- **`src/lib/data/incident-dashboard.ts`**: the existing `status:{not:"Draft"}` filter already lets `AwaitingTriage` through. Seed `statusCounts.AwaitingTriage = 0`; count `awaitingTriage`; **keep it out of the `open` increment and `ACTIVE_INCIDENT_STATUSES`**; build `awaitingTriageQueue` (top 6, oldest-first); compute `avgReportGapHours` (null-guarded). Ship this **in the same deploy** as the submit-routing flip (§7).

---

## 5. UI

### Capture (mobile-first)
- **New `src/lib/incidents/type-modules.ts`** — single registry consumed by **both** the create form and the detail page: `TYPE_MODULES: Record<type, { label, examples, sections: ('injured'|'witnesses')[] }>` + `deriveIntakeSeverity(outcome, injured)`. Existing types keep `['injured','witnesses']`; `NearMiss`/`DangerousOccurrence` = `['witnesses']`.
- **New `type-tile-picker.tsx`** — forgiving tile grid (plain-English examples, ≥44px), emits PascalCase value to a hidden `name="type"`.
- **New `outcome-tap.tsx`** — the single "Was anyone hurt?" question (Yes / No / Not sure, ≥44px); parent maps it via `deriveIntakeSeverity` into hidden `name="severity"`. **The 5×5 matrix is never shown at intake.**
- **`incident-form.tsx`**: swap the Type `<Select>` → tile picker; swap the Severity `<Select>` → outcome tap; **gate** the injured/witness repeaters by `TYPE_MODULES[type].sections` **UNION `incident.<collection>.length > 0`** (so re-typing never hides already-captured data); on type change reset dropped child arrays to `[]`; add a mobile 4-step wizard (Type → Location → Narrative+time → Who) that **CSS-hides** steps (never unmounts inputs, or FormData is lost); fix the draft trap (drop `required` on description, add a hint, disable only *Submit* under 10 chars).
- **`incidents/[id]/page.tsx`**: gate `InjuredPartiesManager`/`WitnessesManager` by the **same** registry (UNION rule).

### Triage
- **New `incidents/triage/page.tsx`** — passive queue (RSC), `canTriageIncidents` gate, `listAwaitingTriage(getCenterContext())`, oldest-first, age RAG cell + report-gap cell.
- **New `incidents/[id]/triage/page.tsx`** + **`triage-form.tsx`** (client, `useActionState(triageIncident)`): confirm type; pick actual-outcome severity; rate potential risk on a 5×5 reusing `riskScore`/`bandMeta` and the `RiskMatrixHeat` grid markup (extract a shared `RiskMatrixPicker` to avoid a forked matrix); capture `hazardCategory` + `definedDoType`; live score+band box.
- **New `triage-age-badge.tsx`** — shared RAG age pill (one home for the bucket logic).

### Dashboard & detail
- **`incidents/page.tsx`**: "Awaiting triage" card above "Needs attention" (mirror the `reportableOpen` panel) using `TriageAgeBadge`; add an "Avg report gap" stat tile (hidden when null).
- **`incident-actions-bar.tsx`**: add `canTriage`; when `status === "AwaitingTriage"` show a primary **"Triage incident"** button → `/incidents/{id}/triage` (heavy rating UI on its own page). `Start investigation` stays gated on `status === "Open"`.
- **`incidents/[id]/page.tsx`**: when `triageStatus === "Triaged"`, render a read-only potential-risk band pill (`bandFromRatings`, null-guarded) + a "Report gap" detail field.
- **Close dialog (the biggest UI gap):** add a `closureOutcome` selector (a / b / c), a **same-centre** RA picker for (b), and review notes. Hide option (c) when `!incident.areaId` or `!canEditContent`.

---

## 6. Out of scope for Phase 1 (deferred)
Safeguarding / row-level access control; special-category (medical/child) PII, consent & retention; notifications & hard SLA escalation; `User` FK for action assignment; scheduled overdue job; taxonomy value-remap of *existing* types (e.g. `HazardousSubstance → Facility`); cross-incident linkage (aggression→accident); incident-side audit log; reusing the CEO sign-off engine for closure.

---

## 7. Build order (one spine — do not run the sub-plans as three parallel "step 1"s)

1. **Lock §0 decisions** (names, lifecycle, RA-link model).
2. **Constants + validation** in one pass (all new `String`-enum/status/category/link-type values) — *before any code writes them*.
3. **Single additive migration** + `prisma generate` (inspect SQL: only `ADD COLUMN`/`CREATE TABLE`/`CREATE INDEX`).
4. **Backend actions**: `triageIncident`, `closeIncident` 3-outcome, `createIncident`/`submitDraft` `reportedAt`; `canTriageIncidents`.
5. **Data layer**: `listAwaitingTriage`, `IncidentListItem`/`toListItem`/dashboard additions.
6. **UI**: type-module registry + capture form/components; triage screen + queue + age badge; dashboard panel; **close dialog 3-outcome controls**.
7. **Flip submit-routing LAST** (Near-miss/DO → `AwaitingTriage`) — only after the triage UI **and** dashboard segregation exist, so reports never pile into a status with no UI and the open-count never drifts.
8. **Verify end-to-end** (§9).

---

## 8. Permissions decision — RESOLVED: admin-only for Phase 1
Verified: `investigateIncidents` ∈ Operations Manager (admin) **only**; Duty Manager has `manageIncidents` but **not** `investigateIncidents`.

**Decision (2026-06-21): keep admin-only — no `ROLE_CAPS` change.** Triage (`triageIncident`) and close (`closeIncident`, incl. all 3 outcomes) are gated on `investigateIncidents`, so only the Operations Manager performs them during the pilot. `reportIncidents` (reporting/capture) stays as today, so any shift role can still file Near-miss reports into the queue. Widening triage to Duty Manager is a later, additive `ROLE_CAPS` change once the flow is proven.

---

## 9. End-to-end acceptance (the slice works when…)
1. File a **Near miss** on a phone-width screen: type tile → location → narrative+time → "was anyone hurt? No". It saves with `status = AwaitingTriage`, `reportedAt` set, `injuredParties = []`.
2. It appears in **Awaiting triage** (dashboard panel + `/incidents/triage`), RAG-coloured by age, with the report-gap shown.
3. A manager **triages**: confirms type, sets outcome severity, rates potential risk on the 5×5 (band shown), sets hazard category. Status → `Open`; potential band + report-gap now render on the detail page.
4. Investigate → add a follow-up action → mark complete.
5. **Close** with outcome **(b)**: pick a same-centre assessment → a `ReviewRequest` (with `sourceIncidentId`) and an `IncidentRiskAssessmentLink(ControlFailureReview)` are created; the assessment's review queue shows "raised from INC-…".
6. **Reopen** → confirm the RA link **survives** (separate row). Close again with **(c)** on an incident *with* an area → a Draft RA is seeded (correct `reference`, `nextReviewDate`, `subjectType=Area`) and linked `SeededDraft`; a duplicate Area RA is **not** created if one already exists.
7. Pre-existing `Open` incidents and a 3-char **draft** still work (no `AwaitingTriage`, no 10-char surprise).
