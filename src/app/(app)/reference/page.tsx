import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AssessmentsTableView } from "@/components/assessments/assessments-table-view";
import { getCenterContext } from "@/lib/center-context";
import { listAssessments } from "@/lib/data/assessments";

export const metadata = { title: "Reference" };

export default async function ReferencePage() {
  const { selected, selectedId } = await getCenterContext();
  const rows = await listAssessments({ centerId: selectedId });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge base"
        title="Reference"
        description="Browse and search every assessment for staff — filter by type, risk, status or centre, then open the one you need."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nothing to show"
          description="No assessments exist in this scope yet."
        />
      ) : (
        <AssessmentsTableView rows={rows} showCenter={!selected} />
      )}
    </div>
  );
}
