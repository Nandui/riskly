import Link from "next/link";
import { Siren, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { IncidentsTableView } from "@/components/incidents/incidents-table-view";
import { getCenterContext } from "@/lib/center-context";
import { getCurrentUser } from "@/lib/auth";
import { canManageIncidents } from "@/lib/incidents/permissions";
import { listIncidents } from "@/lib/data/incidents";

export const metadata = { title: "Incidents" };

export default async function IncidentsListPage() {
  const { selected, selectedId } = await getCenterContext();
  const user = await getCurrentUser();
  const rows = await listIncidents({ centerId: selectedId });
  const canReport = canManageIncidents(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Incidents"
        description="Every reported incident across your centres — accidents, near misses, property damage and more."
        actions={
          canReport ? (
            <Link href="/incidents/new" className={buttonClasses()}>
              <Plus className="size-4" /> Report incident
            </Link>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Siren}
          title="No incidents reported"
          description="When an incident is reported it will appear here, ready to investigate and close."
          action={
            canReport ? (
              <Link href="/incidents/new" className={buttonClasses()}>
                Report incident
              </Link>
            ) : undefined
          }
        />
      ) : (
        <IncidentsTableView rows={rows} showCenter={!selected} />
      )}
    </div>
  );
}
