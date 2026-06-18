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
  and Prisma uses `DATABASE_URL_UNPOOLED` (a **direct** connection) for
  migrations. Neon's Vercel integration sets **both** of these automatically.

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

### 3. Confirm the environment variables
The Neon integration sets both `DATABASE_URL` (pooled) and
`DATABASE_URL_UNPOOLED` (direct) for you — no manual entry needed. You can
verify them under Project → **Settings** → **Environment Variables**.

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

## Authentication (Google sign-in)

Riskly gates access with Google sign-in (Auth.js). Roles: **Admin · Assessor ·
Reviewer · Contributor · Viewer**. Sign-in is restricted to the
`leisureworldcork.com` Google Workspace domain.

### 1. Create a Google OAuth client
1. In **Google Cloud Console** → create/select a project.
2. **APIs & Services → OAuth consent screen** → choose **Internal** (Workspace)
   → set an app name and support email.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application**. Add:
   - **Authorized JavaScript origins:** `https://riskly-leisureworld.vercel.app`
     and `http://localhost:3000`
   - **Authorized redirect URIs:**
     `https://riskly-leisureworld.vercel.app/api/auth/callback/google` and
     `http://localhost:3000/api/auth/callback/google`
4. Copy the **Client ID** and **Client secret**.

### 2. Add the auth environment variables (Vercel → Settings → Environment Variables)
| Variable | Value |
| --- | --- |
| `AUTH_SECRET` | a random secret — run `npx auth secret`, or any 32-byte base64 string |
| `AUTH_GOOGLE_ID` | the OAuth **Client ID** |
| `AUTH_GOOGLE_SECRET` | the OAuth **Client secret** |
| `AUTH_ALLOWED_DOMAINS` | `leisureworldcork.com` |
| `AUTH_ADMIN_EMAILS` | your `@leisureworldcork.com` email (becomes Admin, always allowed in) |

Redeploy, then visit the site and sign in — your account lands as **Admin**.
Manage everyone else under **Users**.

### 3. Turn off Vercel Deployment Protection
Now that the app gates access itself, let staff reach the sign-in page:
**Project → Settings → Deployment Protection → Vercel Authentication →
Disabled** (or restrict it to Preview deployments only).

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
