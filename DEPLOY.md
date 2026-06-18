# Deploying Riskly to Vercel + Neon Postgres

Riskly is a Next.js app backed by **PostgreSQL** (via Prisma). For production it
runs on **Vercel** with a **Neon** Postgres database — both have free tiers, and
data is fully persistent.

> You do the dashboard clicks below (I can't access your Vercel/Neon accounts).
> Everything in the codebase — Postgres schema, migrations, and the build
> pipeline — is already set up.

## How it works

- On every deploy, Vercel runs `npm run vercel-build`, which executes
  `prisma migrate deploy` (applies any new migrations to the database) and then
  `next build`. So the database schema stays in sync automatically.
- The app reads `DATABASE_URL` (a **pooled** connection, safe for serverless),
  and Prisma uses `DIRECT_URL` (a **direct** connection) for migrations.

## One-time setup

### 1. Import the repo into Vercel
1. Go to <https://vercel.com/new> and **Import** `Nandui/riskly` from GitHub.
2. Framework preset auto-detects **Next.js**. Click **Deploy**.
   - The first build may **fail** with a database error — that's expected,
     because the database isn't connected yet. Continue to step 2.

### 2. Add a Neon Postgres database
1. In the Vercel project → **Storage** tab → **Create Database** → choose
   **Neon** (Postgres) → connect it to this project.
2. Vercel/Neon automatically injects a pooled `DATABASE_URL` into the project.

### 3. Add the `DIRECT_URL` variable
Neon gives you **two** connection strings: a **pooled** one and a **direct /
unpooled** one.
1. Project → **Settings** → **Environment Variables**.
2. Confirm `DATABASE_URL` is the **pooled** string (it usually contains
   `-pooler`).
3. Add a new variable **`DIRECT_URL`** and paste Neon's **direct / unpooled**
   connection string. Apply it to all environments.

### 4. Redeploy
Project → **Deployments** → redeploy the latest. The build now runs
`prisma migrate deploy`, which **creates all the tables**, then builds the app.
You're live with a persistent database. 🎉

### 5. (Optional) Enable Analytics & Speed Insights
The app already renders the `<Analytics />` and `<SpeedInsights />` components.
In the Vercel project, open the **Analytics** and **Speed Insights** tabs and
click **Enable** to start collecting data.

### 6. (Optional) Load demo data
Production starts **empty**. To load the Bishopstown demo data once (e.g. to
explore), from your machine with the **production** `DATABASE_URL`/`DIRECT_URL`
in a local `.env`:
```bash
npm run db:seed
```
(then delete the demo records from the app when you're ready for real data.)

## Local development

You need a local Postgres. Two easy options:

**A. Docker (recommended, zero config)** — the repo's `.env` already points here:
```bash
docker compose up -d        # starts Postgres on localhost:5432
npm install
npm run db:migrate          # creates the tables
npm run db:seed             # optional demo data
npm run dev                 # http://localhost:3000
```

**B. Neon dev branch (no Docker)** — in Neon, create a `dev` branch, copy its
pooled + direct strings into `.env` (`DATABASE_URL` / `DIRECT_URL`), then:
```bash
npm install && npm run db:migrate && npm run dev
```

## Changing the schema later

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name describe_change` — creates a new migration
   locally and applies it to your dev database.
3. Commit the new folder under `prisma/migrations/` and push.
4. Vercel applies it automatically on the next deploy (`prisma migrate deploy`).
