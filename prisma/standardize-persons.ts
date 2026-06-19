// One-off backfill: rewrite every hazard's free-text `personAtRisk` to the
// standard categories (Staff, Customers, Children, Contractors, Visitors) using
// the same normalizer the app uses at write time.
//
//   Dry run (preview):  npm run db:standardize-persons
//   Apply changes:      npm run db:standardize-persons -- --apply
//
// Safe to re-run: already-normalised values are left untouched.

import { PrismaClient } from "@prisma/client";
import { normalizePersonsAtRisk } from "../src/lib/persons";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const hazards = await db.hazard.findMany({
    where: { personAtRisk: { not: null } },
    select: { id: true, hazard: true, personAtRisk: true },
  });

  let changed = 0;
  for (const h of hazards) {
    const current = h.personAtRisk ?? "";
    const next = normalizePersonsAtRisk(current);
    if (next === current) continue;
    changed++;
    console.log(
      `  ${h.hazard.slice(0, 40).padEnd(40)} ${JSON.stringify(current)} -> ${JSON.stringify(next || null)}`,
    );
    if (APPLY) {
      await db.hazard.update({
        where: { id: h.id },
        data: { personAtRisk: next || null },
      });
    }
  }

  console.log(
    `\n${changed} of ${hazards.length} hazard(s) ${APPLY ? "updated" : "would change"}.`,
  );
  if (!APPLY && changed > 0) {
    console.log("Dry run — re-run with `-- --apply` to write the changes.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
