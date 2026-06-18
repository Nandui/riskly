import Link from "next/link";
import { Plus, ClipboardList, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AssessmentsTableView } from "@/components/assessments/assessments-table-view";
import { getCenterContext } from "@/lib/center-context";
import { listAssessments } from "@/lib/data/assessments";
import { getCurrentUser, can } from "@/lib/auth";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  const { selected, selectedId } = await getCenterContext();
  const [rows, user] = await Promise.all([
    listAssessments({ centerId: selectedId }),
    getCurrentUser(),
  ]);
  const canEdit = can(user, "editContent");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Assessments"
        description="Every risk assessment in scope. Search, sort and filter by status, risk, type or centre."
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

      {rows.length === 0 ? (
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
        <AssessmentsTableView rows={rows} showCenter={!selected} />
      )}
    </div>
  );
}
