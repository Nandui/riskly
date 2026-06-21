import Link from "next/link";
import { ListChecks, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import {
  IncidentTypeBadge,
  SeverityBadge,
} from "@/components/incidents/incident-badges";
import { TriageAgeBadge } from "@/components/incidents/triage-age-badge";
import { getCenterContext } from "@/lib/center-context";
import { getCurrentUser } from "@/lib/auth";
import { canTriageIncidents } from "@/lib/incidents/permissions";
import { listAwaitingTriage } from "@/lib/data/incidents";
import { humaniseHours } from "@/lib/incidents/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Triage queue" };

export default async function TriageQueuePage() {
  const { selected, selectedId } = await getCenterContext();
  const user = await getCurrentUser();

  if (!canTriageIncidents(user)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Triage queue" description="Reports awaiting triage." />
        <Card>
          <div className="p-6 text-sm text-muted-foreground">
            You don&apos;t have permission to triage incidents.
          </div>
        </Card>
      </div>
    );
  }

  const queue = await listAwaitingTriage(selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Triage queue"
        description="Near-miss and dangerous-occurrence reports awaiting a manager's triage — oldest first."
      />

      {queue.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing awaiting triage"
          description="New near-miss and dangerous-occurrence reports will appear here for review."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {queue.map((inc) => (
              <li key={inc.id}>
                <Link
                  href={`/incidents/${inc.id}/triage`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {inc.reference}
                      </span>
                      <IncidentTypeBadge type={inc.type} />
                      <SeverityBadge severity={inc.severity} />
                    </div>
                    <p className="mt-1 truncate text-sm text-ink">
                      {inc.locationDetail
                        ? `${inc.location} — ${inc.locationDetail}`
                        : inc.location}
                      {!selected && ` · ${inc.centerName}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Occurred {formatDate(inc.occurredAt)}
                      {inc.reportGapHours != null &&
                        ` · reported ${humaniseHours(inc.reportGapHours)} later`}
                    </p>
                  </div>
                  <TriageAgeBadge since={inc.waitingSince} />
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
