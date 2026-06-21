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
import { can } from "@/lib/permissions";
import {
  canAdminIncidents,
  canInvestigateIncidents,
  canManageIncidents,
  canReportIncidents,
  canTriageIncidents,
} from "@/lib/incidents/permissions";
import { getIncidentDetail, getReporterOptions } from "@/lib/data/incidents";
import { listLinkableAssessments } from "@/lib/data/assessments";
import { INCIDENT_TYPE_META, humaniseHours } from "@/lib/incidents/constants";
import { typeHasSection } from "@/lib/incidents/type-modules";
import { incidentModuleGroups } from "@/lib/incidents/module-display";
import { bandFromRatings, bandMeta, riskScore } from "@/lib/risk";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

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
  const canTriage = canTriageIncidents(user);
  const canAdmin = canAdminIncidents(user);
  // Assignees for the follow-up action picker (only needed when managing).
  const users = canManage ? await getReporterOptions() : [];
  // Same-centre assessments for the close-out "link a failed control" picker.
  const linkableAssessments = canInvestigate
    ? await listLinkableAssessments(incident.centerId)
    : [];
  const typeLabel = INCIDENT_TYPE_META[incident.type]?.label ?? incident.type;
  const location = incident.locationDetail
    ? `${incident.location} — ${incident.locationDetail}`
    : incident.location;

  // Show the people sections this type collects, OR any already captured.
  const showInjured =
    typeHasSection(incident.type, "injured") || incident.injuredParties.length > 0;
  const showWitnesses =
    typeHasSection(incident.type, "witnesses") || incident.witnesses.length > 0;

  // Triage outputs (only once rated).
  const hasPotential =
    incident.potentialLikelihood != null && incident.potentialConsequence != null;
  const potentialBand = hasPotential
    ? bandMeta(bandFromRatings(incident.potentialLikelihood!, incident.potentialConsequence!))
    : null;
  const reportGap =
    incident.reportedAt != null
      ? Math.max(0, (incident.reportedAt.getTime() - incident.occurredAt.getTime()) / 36e5)
      : null;

  // Captured per-type module fields, grouped for display.
  const moduleGroups = incidentModuleGroups(incident);

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
            canTriage={canTriage}
            canInvestigate={canInvestigate}
            canAdmin={canAdmin}
            closeContext={{
              assessments: linkableAssessments,
              canLinkExisting: can(user, "requestReview"),
              canSpawnDraft: can(user, "editContent"),
              hasArea: incident.areaId != null,
            }}
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
          {reportGap != null && (
            <DetailField
              label="Report gap"
              value={`Reported ${humaniseHours(reportGap)} after the event`}
            />
          )}
          {potentialBand && (
            <DetailField
              label="Potential risk (triage)"
              value={
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    potentialBand.badge,
                  )}
                >
                  {incident.potentialLikelihood} × {incident.potentialConsequence} ={" "}
                  {riskScore(incident.potentialLikelihood!, incident.potentialConsequence!)} ·{" "}
                  {potentialBand.label}
                </span>
              }
            />
          )}
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

      {moduleGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Type-specific details</CardTitle>
          </CardHeader>
          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {moduleGroups.map((g) => (
              <div key={g.group}>
                <h3 className="eyebrow mb-2">{g.group}</h3>
                <dl className="space-y-1.5">
                  {g.rows.map((r) => (
                    <div key={r.label} className="flex justify-between gap-3 text-sm">
                      <dt className="text-muted-foreground">{r.label}</dt>
                      <dd className="text-right text-ink">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showInjured && (
        <InjuredPartiesManager
          incidentId={incident.id}
          parties={incident.injuredParties}
          canManage={canManage}
        />
      )}
      {showWitnesses && (
        <WitnessesManager
          incidentId={incident.id}
          witnesses={incident.witnesses}
          canManage={canManage}
        />
      )}
      <FollowUpActionsManager
        incidentId={incident.id}
        actions={incident.followUpActions}
        users={users}
        canManage={canManage}
      />
    </div>
  );
}
