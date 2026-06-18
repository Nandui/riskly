import Link from "next/link";
import { Plus, ClipboardList, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AssessmentFilters } from "@/components/assessments/assessment-filters";
import { AssessmentTable } from "@/components/assessments/assessment-table";
import { getCenterContext } from "@/lib/center-context";
import { listAssessments } from "@/lib/data/assessments";
import { getTaxonomyOptions } from "@/lib/data/library";
import { getCurrentUser, can } from "@/lib/auth";
import { pluralize } from "@/lib/utils";

export const metadata = { title: "Assessments" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const { selected, selectedId } = await getCenterContext();
  const current = {
    q: get("q"),
    areaId: get("areaId"),
    roleId: get("roleId"),
    activityId: get("activityId"),
    status: get("status"),
    band: get("band"),
  };

  const [rows, options] = await Promise.all([
    listAssessments({
      centerId: selectedId,
      areaId: current.areaId || undefined,
      roleId: current.roleId || undefined,
      activityId: current.activityId || undefined,
      status: current.status || undefined,
      band: current.band || undefined,
      search: current.q || undefined,
    }),
    getTaxonomyOptions(selectedId),
  ]);

  const canEdit = can(await getCurrentUser(), "editContent");
  const anyFilter = Object.values(current).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Assessments"
        description="Every risk assessment in scope. Filter by area, role, activity, status or residual risk."
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Link
                href="/assessments/import"
                className={buttonClasses({ variant: "secondary" })}
              >
                <Upload className="size-4" /> Import
              </Link>
              <Link href="/assessments/new" className={buttonClasses()}>
                <Plus className="size-4" /> New assessment
              </Link>
            </div>
          ) : undefined
        }
      />

      <AssessmentFilters
        basePath="/assessments"
        current={current}
        areas={options.areas}
        roles={options.roles}
        activities={options.activities}
        showArea={!!selected}
      />

      {rows.length === 0 ? (
        anyFilter ? (
          <EmptyState
            icon={ClipboardList}
            title="No matching assessments"
            description="Try adjusting or clearing your filters."
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No assessments yet"
            description="Create your first risk assessment to start documenting hazards and controls."
            action={
              canEdit ? (
                <Link href="/assessments/new" className={buttonClasses()}>
                  <Plus className="size-4" /> New assessment
                </Link>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {rows.length} {pluralize(rows.length, "assessment")}
          </p>
          <AssessmentTable rows={rows} showCenter={!selected} />
        </div>
      )}
    </div>
  );
}
