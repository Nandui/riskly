import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { getCenterContext } from "@/lib/center-context";
import { listAreas, listRoles, listActivities } from "@/lib/data/library";
import { LibraryManager } from "@/components/library/library-manager";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const { selected } = await getCenterContext();
  const [areas, roles, activities] = await Promise.all([
    selected ? listAreas(selected.id) : Promise.resolve([]),
    listRoles(),
    listActivities(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reference data"
        title="Library"
        description="The areas, roles and activities used to classify every assessment. Keep these tidy and assessments stay easy to find."
      />
      <Card className="p-5 sm:p-6">
        <LibraryManager
          selectedCenter={selected ? { id: selected.id, name: selected.name } : null}
          areas={areas}
          roles={roles}
          activities={activities}
        />
      </Card>
    </div>
  );
}
