# Incidents — Phase 2 (operational framework complete)

Built on branch `feat/incidents-phase1`. Completes the leisure-centre event taxonomy and the per-type capture modules, so a report asks for the right things from every operational angle. **Additive-only** on the shared Neon DB; **forward-only** taxonomy (no production rows rewritten).

## Taxonomy
Selectable types are now: **Accident · Near miss · Dangerous occurrence · Aquatic / water rescue · Medical / first aid · Security / antisocial · Facility / environmental · Other.**

The legacy types (Property damage, Violence/aggression, Hazardous substance, Fire/evacuation) are **retired from the picker** but kept in `INCIDENT_TYPE_META` and tolerated by validation, so historical incidents still render and edit without being silently reclassified. No backfill/rewrite was run (the guardrail correctly blocked rewriting prod rows; forward-only is the safe equivalent).

## Per-type modules (captured at intake, conditional on type)
- **Emergency response** (Accident / Aquatic / Medical): ambulance called, AED used, CPR/resuscitation.
- **Accident**: mechanism (+ injured-party child records as before).
- **Aquatic**: rescue type, EAP level, lifeguards on duty, time in difficulty, spinal management, secondary-drowning advice.
- **Medical**: presenting condition, conscious, breathing, casualty handover.
- **Facility / water**: AFR, free/combined chlorine, pH, corrective dosing, closure start/end, samples sent.
- **Security**: crime/Garda reference, Gardaí notified, ejection.

All stored as **nullable columns** on `Incident` (sparse-wide pattern; one additive migration `…_incident_phase2_type_modules`). The form renders only the selected type's section, so non-applicable fields are never posted. Captured at intake; displayed read-only under "Type-specific details" on the incident page.

## Lifecycle & severity
- **All** submitted reports now route to **AwaitingTriage** (the proper lifecycle — every incident gets a manager triage). Drafts stay Draft.
- Severity at intake = **actual outcome**, shown only for types where personal injury is inherent (Accident, Aquatic, Medical, Security, Other). Near-miss / Dangerous-occurrence / Facility hide it ("assessed at triage").
- Triage now also records an **advisory HSA-reportable** decision — a recorded human judgement, never an automatic legal determination.

### Severity scale — type-neutral (reframed)
The actual-outcome scale now reads **None · Minor · Moderate · Major · Critical** with impact-neutral descriptions (covering harm, operational disruption *or* regulatory significance), so it fits every stream — not just personal-injury accidents. "None" suits a near miss or a contained event (it's the provisional intake default for the hide-severity types).

**No data migration:** the stored enum *values* are unchanged (`None/Minor/Significant/Reportable/Critical`) — only the display **labels + descriptions** changed (`Significant`→"Moderate", `Reportable`→"Major"). This also de-conflates the old "Reportable" severity from the new **HSA-reportable** flag. Dashboard wording updated to "High-severity open / still open". The one quirk to know: severity value `Reportable` now displays as **"Major"**.

## Explicitly deferred
- **Safeguarding / child-protection** — a confidential row-level access-control subsystem; deferred by decision (2026-06-21). Needs the visibility primitive + a security review + authenticated testing before it touches child data. Do **not** add it as a plain type.
- **PDF incident report** doesn't yet include the new module fields.
- Module fields are **capture-only** (no post-create edit UI yet).
- "Reportable" remains a severity *level*; the cleaner model (derived flag) is superseded in practice by the new advisory `hsaReportable` but the enum was left as-is.

## Verification
`tsc --noEmit` clean · `next build` green (all routes) · dev server serves with 0 errors. **Authenticated click-through not run** (no test login here) — exercise the §9 acceptance checklist in `incidents-phase1-plan.md` plus: file an Aquatic report → confirm the aquatic module fields save and show on the detail page.
