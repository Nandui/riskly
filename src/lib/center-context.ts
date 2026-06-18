import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CENTER_COOKIE, ALL_CENTERS } from "@/lib/center-shared";
import type { CenterSummary } from "@/lib/center-shared";

// "Current centre" is stored in a cookie (auth is deferred for v1).
export {
  CENTER_COOKIE,
  ALL_CENTERS,
  type CenterSummary,
} from "@/lib/center-shared";

export async function getSelectedCenterId(): Promise<string | null> {
  const store = await cookies();
  const val = store.get(CENTER_COOKIE)?.value;
  if (!val || val === ALL_CENTERS) return null;
  return val;
}

export interface CenterContext {
  centers: CenterSummary[];
  selectedId: string | null; // null = all centres
  selected: CenterSummary | null;
}

// Active centres rarely change and are the same for everyone, so cache the
// list across requests and refresh only when a centre is added/edited
// (revalidateTag("centers")). Saves a DB round-trip on every navigation.
const getActiveCenters = unstable_cache(
  () =>
    db.center.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ["active-centers"],
  { tags: ["centers"] },
);

export async function getCenterContext(): Promise<CenterContext> {
  const [centers, rawSelected] = await Promise.all([
    getActiveCenters(),
    getSelectedCenterId(),
  ]);
  const selected = centers.find((c) => c.id === rawSelected) ?? null;
  return { centers, selectedId: selected?.id ?? null, selected };
}

// Prisma where-fragment scoped to the selected centre (empty = all centres).
export function centerScope(selectedId: string | null) {
  return selectedId ? { centerId: selectedId } : {};
}
