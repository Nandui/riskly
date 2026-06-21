import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionsOverviewTable } from "@/components/incidents/actions-overview-table";
import { getCenterContext } from "@/lib/center-context";
import { getCurrentUser } from "@/lib/auth";
import { canManageIncidents } from "@/lib/incidents/permissions";
import { listFollowUpActions } from "@/lib/data/incidents";

export const metadata = { title: "Follow-up actions" };

export default async function FollowUpActionsPage() {
  const { selected, selectedId } = await getCenterContext();
  const user = await getCurrentUser();
  const rows = await listFollowUpActions({ centerId: selectedId });
  const canManage = canManageIncidents(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Follow-up actions"
        description="Corrective and preventive actions from across your incidents — what's open, in progress and overdue."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No follow-up actions"
          description="Actions raised while investigating an incident will appear here."
        />
      ) : (
        <ActionsOverviewTable rows={rows} showCenter={!selected} canManage={canManage} />
      )}
    </div>
  );
}
