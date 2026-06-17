import { db } from "@/lib/db";

export async function listCenters() {
  return db.center.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { areas: true, assessments: true } },
    },
  });
}

export async function getCenter(id: string) {
  return db.center.findUnique({ where: { id } });
}

export type CenterWithCounts = Awaited<
  ReturnType<typeof listCenters>
>[number];
