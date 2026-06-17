# Riskly

A web app for **documenting, monitoring and referencing health & safety risk assessments** across the sites of a leisure operator (pools, gyms, sports halls, soft play, studios…).

One organisation, many centres. Every assessment is classified by **area**, **role** and **activity**, and rated with the HSE-standard **5×5 risk matrix** (Likelihood × Severity), with both an initial and a residual rating.

## What it does

- **Document** — create and edit assessments with hazard line-items, existing/additional controls, and per-hazard 5×5 scoring. Click a matrix cell to set likelihood × severity; scores and bands compute live.
- **Monitor** — a dashboard and monitoring queue surface overdue / due-soon reviews and open / overdue actions. Log a review to roll the next review date forward and keep an audit trail.
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
- **RiskAssessment** — classified by centre + area + (role) + (activity); has a status, assessment date, review frequency and computed next-review date.
- **Hazard** — a line item: hazard, who's at risk, existing controls, initial L×S, additional controls, residual L×S, and an optional action (owner / due / status).
- **ReviewLog** — an audit record written each time a review is logged.

**Risk bands:** Low 1–4 · Medium 5–9 · High 10–15 · Critical 16–25. The risk colour palette (green → amber → orange → red) is reserved strictly for risk bands.

## Notes & roadmap

- **Authentication is intentionally deferred** in this version — there is no login yet. The data model is auth-ready: assessor/approver are kept as fields, and users/roles (Admin / Assessor / Viewer) with per-centre access can be layered on later.
- Possible next steps: real auth & permissions, PDF export & e-signatures, photo/file attachments, assessment version history & approval workflow, and email reminders for due reviews.
