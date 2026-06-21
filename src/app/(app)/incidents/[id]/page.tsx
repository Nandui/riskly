import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline, type ActivityItem } from "@/components/ui/activity-timeline";
import {
  IncidentStatusBadge,
  SeverityBadge,
} from "@/components/incidents/incident-badges";
import { IncidentActionsBar } from "@/components/incidents/incident-actions-bar";
import { ExportIncidentReportButton } from "@/components/incidents/export-incident-report-button";
import { IncidentDetailsEditor } from "@/components/incidents/incident-details-editor";
import { IncidentModuleEditor } from "@/components/incidents/incident-module-editor";
import { EvidenceRequestsManager } from "@/components/incidents/evidence-requests-manager";
import { IncidentInvestigationCard } from "@/components/incidents/incident-investigation-card";
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
} from "@/lib/incidents/permissions";
import {
  getAreaOptions,
  getIncidentDetail,
  getReporterOptions,
} from "@/lib/data/incidents";
import { getCenterContext } from "@/lib/center-context";
import { listLinkableAssessments } from "@/lib/data/assessments";
import { INCIDENT_TYPE_META, humaniseHours } from "@/lib/incidents/constants";
import { moduleFor, typeHasResponseBlock, typeHasSection } from "@/lib/incidents/type-modules";
import { incidentModuleGroups } from "@/lib/incidents/module-display";
import { riskScore, bandMeta } from "@/lib/risk";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { IncidentDetail } from "@/lib/incidents/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await getIncidentDetail(id);
  return { title: incident ? incident.reference : "Incident" };
}

function GlanceRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow mb-1">{label}</dt>
      <dd className="text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

// A lightweight lifecycle timeline derived from the incident's own timestamps —
// there's no incident audit log, so this is the honest record of who did what.
function buildActivity(incident: IncidentDetail): ActivityItem[] {
  const items: ActivityItem[] = [];
  if (incident.reportedAt) {
    items.push({
      id: "reported",
      action: "reported",
      detail: null,
      userName: incident.reportedBy,
      timestamp: formatDateTime(incident.reportedAt),
    });
  } else {
    items.push({
      id: "created",
      action: incident.status === "Imported" ? "imported" : "created",
      detail: null,
      userName: incident.reportedBy,
      timestamp: formatDateTime(incident.createdAt),
    });
  }
  if (incident.triagedAt) {
    items.push({
      id: "triaged",
      action: "triaged",
      detail:
        incident.triageStatus === "ReferredToRA"
          ? "Referred to a risk assessment"
          : null,
      userName: incident.triagedBy,
      timestamp: formatDateTime(incident.triagedAt),
    });
  }
  if (incident.closedAt) {
    items.push({
      id: "closed",
      action: "closed",
      detail: null,
      userName: incident.closedBy,
      timestamp: formatDateTime(incident.closedAt),
    });
  }
  return items;
}

// An advisory "is this ready to close?" checklist — not enforced, just a glance.
function buildChecklist(incident: IncidentDetail): { label: string; done: boolean }[] {
  const items: { label: string; done: boolean }[] = [];
  const cctv = incident.evidenceRequests.filter((r) => r.kind === "CCTV");
  const openActions = incident.followUpActions.filter(
    (a) => a.status !== "Complete",
  ).length;

  items.push({
    label: "Evidence captured or requested",
    done:
      !!incident.photoUrl ||
      incident.evidenceRequests.length > 0 ||
      !!incident.evidenceRef,
  });
  if (cctv.length) {
    // "Unavailable" is a terminal outcome too (footage gone / no coverage), so
    // only an outstanding "Requested" keeps this item open.
    items.push({
      label: "CCTV secured or resolved",
      done: cctv.every((r) => r.status !== "Requested"),
    });
  }
  if (typeHasSection(incident.type, "witnesses")) {
    items.push({
      label: "Witness statement on file",
      done: incident.witnesses.some((w) => w.statement?.trim()),
    });
  }
  if (incident.injuredParties.length > 0) {
    items.push({
      label: "Injured-person details complete",
      done: incident.injuredParties.every((p) => p.injuryNature?.trim()),
    });
  }
  items.push({
    label: "Investigation notes added",
    done: !!incident.investigationNotes?.trim(),
  });
  items.push({
    label:
      incident.followUpActions.length > 0
        ? `Follow-up actions complete (${incident.followUpActions.length - openActions}/${incident.followUpActions.length})`
        : "No follow-up actions outstanding",
    done: openActions === 0,
  });
  return items;
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
  const isAdmin = can(user, "admin");

  // The inline editors (details + module + follow-up assignees) only load their
  // option data when the viewer can actually edit.
  const [users, areaOptions, centerCtx, linkableAssessments] = await Promise.all([
    canManage ? getReporterOptions() : Promise.resolve([]),
    canManage ? getAreaOptions(null) : Promise.resolve([]),
    canManage ? getCenterContext() : Promise.resolve({ centers: [] }),
    canInvestigate
      ? listLinkableAssessments(incident.centerId)
      : Promise.resolve([]),
  ]);
  const centers = centerCtx.centers;
  const areasForCenter = areaOptions
    .filter((a) => a.centerId === incident.centerId)
    .map((a) => ({ id: a.id, name: a.name }));

  const typeLabel = INCIDENT_TYPE_META[incident.type]?.label ?? incident.type;
  const location = incident.locationDetail
    ? `${incident.location} — ${incident.locationDetail}`
    : incident.location;

  const showInjured =
    typeHasSection(incident.type, "injured") || incident.injuredParties.length > 0;
  const showWitnesses =
    typeHasSection(incident.type, "witnesses") || incident.witnesses.length > 0;

  const reportGap =
    incident.reportedAt != null
      ? Math.max(0, (incident.reportedAt.getTime() - incident.occurredAt.getTime()) / 36e5)
      : null;

  const moduleGroups = incidentModuleGroups(incident);
  const hasModuleCapture =
    moduleFor(incident.type).modules.length > 0 ||
    typeHasResponseBlock(incident.type);
  const showModuleCard = hasModuleCapture || moduleGroups.length > 0;

  const detailsEditor = canManage ? (
    <IncidentDetailsEditor
      incident={incident}
      centers={centers}
      areaOptions={areaOptions}
      isAdmin={isAdmin}
      reporterOptions={users}
    />
  ) : null;

  const activity = buildActivity(incident);
  const checklist = buildChecklist(incident);

  const potentialScore =
    incident.potentialLikelihood && incident.potentialConsequence
      ? riskScore(incident.potentialLikelihood, incident.potentialConsequence)
      : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <Link
          href="/incidents/list"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Incidents
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">{incident.reference}</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                {typeLabel}
              </h1>
              <IncidentStatusBadge status={incident.status} />
              <SeverityBadge severity={incident.severity} />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {location} · {formatDateTime(incident.occurredAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ExportIncidentReportButton incident={incident} />
          </div>
        </div>
      </div>

      {/* ── Lifecycle bar ── */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            {incident.status === "Closed"
              ? `Closed ${formatDate(incident.closedAt)}${incident.closedBy ? ` · ${incident.closedBy}` : ""}`
              : "Manage this incident through its lifecycle."}
          </p>
          <IncidentActionsBar
            incident={{ id: incident.id, status: incident.status }}
            canReport={canReport}
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

      {/* ── Workspace: main + sticky rail ── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* MAIN */}
        <div className="order-2 space-y-6 lg:order-1">
          {/* Narrative */}
          <Card>
            <CardHeader>
              <CardTitle>What happened</CardTitle>
              {detailsEditor}
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

          {/* Type-specific detail */}
          {showModuleCard && (
            <Card>
              <CardHeader>
                <CardTitle>Type-specific details</CardTitle>
                {canManage && (
                  <IncidentModuleEditor
                    incidentId={incident.id}
                    type={incident.type}
                    defaults={incident}
                    areas={areasForCenter}
                    label={moduleGroups.length > 0 ? "Edit" : "Add detail"}
                  />
                )}
              </CardHeader>
              {moduleGroups.length > 0 ? (
                <div className="grid gap-5 p-5 sm:grid-cols-2">
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
              ) : (
                <p className="p-5 text-sm text-muted-foreground">
                  No type-specific detail recorded yet.
                  {canManage ? " Use “Add detail” to capture it." : ""}
                </p>
              )}
            </Card>
          )}

          {/* Evidence & requests */}
          <EvidenceRequestsManager
            incidentId={incident.id}
            requests={incident.evidenceRequests}
            canManage={canManage}
          />

          {/* Investigation: photo + notes */}
          <IncidentInvestigationCard
            incidentId={incident.id}
            photoUrl={incident.photoUrl}
            notes={incident.investigationNotes}
            canManage={canManage}
          />

          {/* People */}
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

          {/* Follow-up actions */}
          <FollowUpActionsManager
            incidentId={incident.id}
            actions={incident.followUpActions}
            users={users}
            canManage={canManage}
          />
        </div>

        {/* RAIL */}
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-6 lg:self-start">
          {/* At a glance */}
          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
              {canManage && (
                <IncidentDetailsEditor
                  compact
                  incident={incident}
                  centers={centers}
                  areaOptions={areaOptions}
                  isAdmin={isAdmin}
                  reporterOptions={users}
                />
              )}
            </CardHeader>
            <dl className="grid gap-3.5 p-5">
              {potentialScore != null && (
                <div>
                  <dt className="eyebrow mb-1">Potential risk</dt>
                  <dd>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                        bandMeta(potentialScore).badge,
                      )}
                    >
                      {incident.potentialLikelihood} × {incident.potentialConsequence} ={" "}
                      {potentialScore} · {bandMeta(potentialScore).label}
                    </span>
                  </dd>
                </div>
              )}
              <GlanceRow label="Occurred" value={formatDateTime(incident.occurredAt)} />
              <GlanceRow label="Location" value={location} />
              <GlanceRow label="Centre" value={incident.center.name} />
              <GlanceRow label="Reported by" value={incident.reportedBy} />
              {reportGap != null && (
                <GlanceRow
                  label="Report gap"
                  value={`Reported ${humaniseHours(reportGap)} after the event`}
                />
              )}
              <GlanceRow
                label="Injured / witnesses"
                value={`${incident.injuredParties.length} injured · ${incident.witnesses.length} witness${incident.witnesses.length === 1 ? "" : "es"}`}
              />
              {incident.triagedAt && (
                <GlanceRow
                  label="Triaged by"
                  value={incident.triagedBy ?? "—"}
                />
              )}
            </dl>
          </Card>

          {/* Investigation checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Investigation checklist</CardTitle>
            </CardHeader>
            <ul className="space-y-2.5 p-5">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5 text-sm">
                  {c.done ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-low" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={c.done ? "text-ink-soft" : "text-ink"}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <div className="p-5">
              <ActivityTimeline items={activity} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
