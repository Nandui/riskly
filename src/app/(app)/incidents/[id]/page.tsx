import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import {
  IncidentStatusBadge,
  IncidentTypeBadge,
  SeverityBadge,
} from "@/components/incidents/incident-badges";
import { IncidentActionsBar } from "@/components/incidents/incident-actions-bar";
import { ExportIncidentReportButton } from "@/components/incidents/export-incident-report-button";
import { InjuredPartiesManager } from "@/components/incidents/injured-parties-manager";
import { WitnessesManager } from "@/components/incidents/witnesses-manager";
import { FollowUpActionsManager } from "@/components/incidents/follow-up-actions-manager";
import { getCurrentUser } from "@/lib/auth";
import {
  canAdminIncidents,
  canInvestigateIncidents,
  canManageIncidents,
  canReportIncidents,
} from "@/lib/incidents/permissions";
import { getIncidentDetail } from "@/lib/data/incidents";
import { INCIDENT_TYPE_META } from "@/lib/incidents/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await getIncidentDetail(id);
  return { title: incident ? incident.reference : "Incident" };
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow mb-1">{label}</dt>
      <dd className="text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, incident] = await Promise.all([
    getCurrentUser(),
    getIncidentDetail(id),
  ]);
  if (!incident) notFound();

  const canReport = canReportIncidents(user);
  const canManage = canManageIncidents(user);
  const canInvestigate = canInvestigateIncidents(user);
  const canAdmin = canAdminIncidents(user);
  const typeLabel = INCIDENT_TYPE_META[incident.type]?.label ?? incident.type;
  const location = incident.locationDetail
    ? `${incident.location} — ${incident.locationDetail}`
    : incident.location;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/incidents/list"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Incidents
        </Link>
        <PageHeader
          eyebrow={incident.reference}
          title={typeLabel}
          description={`${location} · ${formatDateTime(incident.occurredAt)}`}
          actions={
            <>
              <ExportIncidentReportButton incident={incident} />
              {canManage && (
                <Link
                  href={`/incidents/${incident.id}/edit`}
                  className={buttonClasses({ variant: "secondary" })}
                >
                  <Pencil className="size-4" /> Edit
                </Link>
              )}
            </>
          }
        />
      </div>

      {/* Status + lifecycle controls */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <IncidentStatusBadge status={incident.status} />
            <SeverityBadge severity={incident.severity} />
            <IncidentTypeBadge type={incident.type} />
          </div>
          <IncidentActionsBar
            incident={{ id: incident.id, status: incident.status }}
            canReport={canReport}
            canInvestigate={canInvestigate}
            canAdmin={canAdmin}
          />
        </div>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Incident details</CardTitle>
        </CardHeader>
        <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Occurred" value={formatDateTime(incident.occurredAt)} />
          <DetailField label="Location" value={location} />
          <DetailField label="Centre" value={incident.center.name} />
          <DetailField label="Reported by" value={incident.reportedBy} />
          <DetailField
            label="Injured / witnesses"
            value={`${incident.injuredParties.length} injured · ${incident.witnesses.length} witness${incident.witnesses.length === 1 ? "" : "es"}`}
          />
          {incident.status === "Closed" && (
            <DetailField
              label="Closed"
              value={`${formatDate(incident.closedAt)}${incident.closedBy ? ` · ${incident.closedBy}` : ""}`}
            />
          )}
        </dl>
      </Card>

      {/* Narrative */}
      <Card>
        <CardHeader>
          <CardTitle>What happened</CardTitle>
        </CardHeader>
        <div className="space-y-5 p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {incident.description}
          </p>
          {incident.immediateAction && (
            <div>
              <h3 className="eyebrow mb-1.5">Immediate action taken</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {incident.immediateAction}
              </p>
            </div>
          )}
          {incident.status === "Closed" && incident.closureNotes && (
            <div className="rounded-[var(--radius-card)] border border-line bg-surface-2/50 p-4">
              <h3 className="eyebrow mb-1.5">Closure notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {incident.closureNotes}
              </p>
            </div>
          )}
        </div>
      </Card>

      <InjuredPartiesManager
        incidentId={incident.id}
        parties={incident.injuredParties}
        canManage={canManage}
      />
      <WitnessesManager
        incidentId={incident.id}
        witnesses={incident.witnesses}
        canManage={canManage}
      />
      <FollowUpActionsManager
        incidentId={incident.id}
        actions={incident.followUpActions}
        canManage={canManage}
      />
    </div>
  );
}
