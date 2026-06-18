import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { getCenterContext } from "@/lib/center-context";
import {
  listAreas,
  listRoles,
  listActivities,
  listDepartments,
  type LibraryEntity,
} from "@/lib/data/library";
import { LibraryManager } from "@/components/library/library-manager";
import { requireCapability } from "@/lib/auth";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  await requireCapability("editContent");
  const { selected, centers } = await getCenterContext();

  const areaEntries = await Promise.all(
    centers.map(async (c) => [c.id, await listAreas(c.id)] as const),
  );
  const areasByCenter: Record<string, LibraryEntity[]> =
    Object.fromEntries(areaEntries);

  const [roles, activities, departments] = await Promise.all([
    listRoles(),
    listActivities(),
    listDepartments(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reference data"
        title="Library"
        description="The areas, roles, activities and departments used to build assessments. Areas belong to a centre; the rest are shared across all centres."
      />
      <Card className="p-5 sm:p-6">
        <LibraryManager
          centers={centers.map((c) => ({ id: c.id, name: c.name }))}
          defaultCenterId={selected?.id ?? centers[0]?.id ?? null}
          areasByCenter={areasByCenter}
          roles={roles}
          activities={activities}
          departments={departments}
        />
      </Card>
    </div>
  );
}
