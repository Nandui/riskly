import { db } from "@/lib/db";

export interface LibraryEntity {
  id: string;
  name: string;
  description: string | null;
  usageCount: number;
}

export async function listAreas(centerId: string): Promise<LibraryEntity[]> {
  const rows = await db.area.findMany({
    where: { centerId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { assessments: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    usageCount: r._count.assessments,
  }));
}

export async function listRoles(): Promise<LibraryEntity[]> {
  const rows = await db.role.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { assessments: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    usageCount: r._count.assessments,
  }));
}

export async function listActivities(): Promise<LibraryEntity[]> {
  const rows = await db.activity.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { assessments: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    usageCount: r._count.assessments,
  }));
}

export async function listDepartments(): Promise<LibraryEntity[]> {
  const rows = await db.department.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { assessments: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    usageCount: r._count.assessments,
  }));
}

// Lightweight option lists for assessment form selects.
export async function getTaxonomyOptions(centerId?: string | null) {
  const [areas, roles, activities] = await Promise.all([
    centerId
      ? db.area.findMany({
          where: { centerId },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    db.role.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.activity.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  return { areas, roles, activities };
}

// Everything the CSV importer needs to populate its centre / subject pickers.
export async function getImportOptions() {
  const [centers, areas, roles, activities] = await Promise.all([
    db.center.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.area.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, centerId: true },
    }),
    db.role.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.activity.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  return { centers, areas, roles, activities };
}

export type ImportOptions = Awaited<ReturnType<typeof getImportOptions>>;
