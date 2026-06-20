import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Generate a human-readable incident reference: INC-XX-NNNN
//   XX   = the Center's siteCode (2-letter), uppercased (falls back to "XX")
//   NNNN = zero-padded sequential number, scoped per centre
//
// Derived from the highest existing reference for the centre (not a row count),
// so deleting an incident never causes a number to be reused/collide. Pass a
// transaction client so the read + create are atomic; the caller retries on the
// unique-constraint race (see actions/incidents.ts).
export async function generateIncidentReference(
  centerId: string,
  tx: Prisma.TransactionClient = db,
): Promise<string> {
  const center = await tx.center.findUniqueOrThrow({
    where: { id: centerId },
    select: { siteCode: true },
  });
  const code = center.siteCode?.toUpperCase() || "XX";

  const last = await tx.incident.findFirst({
    where: { centerId },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });

  const lastNum = last ? Number.parseInt(last.reference.slice(-4), 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `INC-${code}-${String(next).padStart(4, "0")}`;
}
