# Riskly

A web app for **documenting, monitoring and referencing health & safety risk assessments** across the sites of a leisure operator (pools, gyms, sports halls, soft play, studios…).

One organisation, many centres. Every assessment is built around one subject — an **area**, a **role**, or an **activity** — and is named after it, with all of that subject's hazards inside. Each hazard is rated with a **5×5 risk matrix** (Likelihood × Consequence Severity = Overall Risk) based on current controls.

## What it does

- **Document** — create and edit assessments with hazard line-items, existing/additional controls, and per-hazard 5×5 scoring. Click a matrix cell to set likelihood × severity; scores and bands compute live.
- **Monitor** — a dashboard and monitoring queue surface overdue / due-soon reviews and high-risk hazards (High / Very High). Log a review to roll the next review date forward and keep an audit trail.
- **Reference** — a searchable knowledge base, groupable by area, role or activity, with a clean, print-friendly read-only view of every assessment.

Data is scoped to a **current centre** (chosen in the sidebar switcher), with an "All centres" overview.

## Tech stack

- **Next.js** (App Router, React Server Components, Server Actions) + **TypeScript**
- **Tailwind CSS v4** for styling (design tokens in `src/app/globals.css`)
- **Prisma** ORM with a **SQLite** database (swap the datasource for Postgres later)
- **Zod** for input validation

## Getting started

```bash
npm install          # install dependencies
npm run db:push      # create the SQLite database from the Prisma schema
npm run db:seed      # load realistic demo data (2 centres, 9 assessments)
npm run dev          # start the dev server → http://localhost:3000
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:push` | Apply the Prisma schema to the database |
| `npm run db:seed` | Wipe and reload demo data |
| `npm run db:reset` | Force-reset the database and reseed |
| `npm run db:studio` | Open Prisma Studio to browse the data |

The database connection string lives in `.env` (`DATABASE_URL="file:./dev.db"`).

## Project structure

```
prisma/
  schema.prisma          # Center, Area, Role, Activity, RiskAssessment, Hazard, ReviewLog
  seed.ts                # demo data
src/
  app/                   # routes: dashboard, assessments, monitoring, reference, centers, library
  components/            # app shell, risk matrix, forms, tables, ui primitives
  lib/
    risk.ts              # the 5×5 risk engine — scoring, bands, matrix (single source of truth)
    data/                # read queries (assessments, centers, library, monitoring)
    actions/             # server actions / mutations
    validation.ts        # zod schemas
    center-context.ts    # current-centre selection (cookie based)
```

## Domain model

- **Center** — a site. Top-level scope.
- **Area** — a physical/functional space within a centre (per-centre).
- **Role** / **Activity** — org-level shared libraries used to classify assessments.
- **RiskAssessment** — covers one subject (an area, role *or* activity, chosen via `subjectType`) at a centre and is named after it; has a status, assessment date, review frequency and computed next-review date.
- **Hazard** — a line item matching the client's columns: hazard, risk factor, person at risk, consequence, current controls, Likelihood × Consequence Severity = Overall Risk, and a Risk Category (Physical / Chemical / Biological / Ergonomic / Psychosocial / Environmental).
- **ReviewLog** — an audit record written each time a review is logged.

**Risk bands:** Low 1–4 · Medium 5–9 · High 10–16 · Very High 17–25. The risk colour palette (green → amber → orange → red) is reserved strictly for risk bands.

## Notes & roadmap

- **Authentication is intentionally deferred** in this version — there is no login yet. The data model is auth-ready: assessor/approver are kept as fields, and users/roles (Admin / Assessor / Viewer) with per-centre access can be layered on later.
- Possible next steps: real auth & permissions, PDF export & e-signatures, photo/file attachments, assessment version history & approval workflow, and email reminders for due reviews.
