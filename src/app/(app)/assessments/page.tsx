import Link from "next/link";
import { Plus, ClipboardList, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AssessmentsTableView } from "@/components/assessments/assessments-table-view";
import { AssessmentSearchBar } from "@/components/assessments/assessment-search-bar";
import { AssessmentSearchResults } from "@/components/assessments/assessment-search-results";
import { getCenterContext } from "@/lib/center-context";
import { listAssessments, searchAssessments } from "@/lib/data/assessments";
import { getCurrentUser, can } from "@/lib/auth";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const { selected, selectedId } = await getCenterContext();
  const user = await getCurrentUser();
  const canEdit = can(user, "editContent");

  const results = query ? await searchAssessments(query, selectedId) : null;
  const rows = query ? [] : await listAssessments({ centerId: selectedId });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Assessments"
        description="Search across every hazard, control and risk factor — not just titles."
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

      <AssessmentSearchBar defaultQuery={query} />

      {query ? (
        <AssessmentSearchResults
          query={query}
          hits={results ?? []}
          showCenter={!selected}
        />
      ) : rows.length === 0 ? (
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
      ) : (
        <AssessmentsTableView
          rows={rows}
          showCenter={!selected}
          searchable={false}
        />
      )}
    </div>
  );
}
