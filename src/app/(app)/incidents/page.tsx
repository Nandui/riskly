import Link from "next/link";
import {
  Siren,
  Plus,
  TriangleAlert,
  CalendarX,
  UserRound,
  ListChecks,
  ArrowRight,
  CircleAlert,
  FolderOpen,
  Hourglass,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IncidentTypeBadge,
  SeverityBadge,
} from "@/components/incidents/incident-badges";
import { TriageAgeBadge } from "@/components/incidents/triage-age-badge";
import {
  IncidentActivityChart,
  IncidentSeverityChart,
  IncidentTypeChart,
} from "@/components/incidents/incident-charts";
import { IncidentsTableView } from "@/components/incidents/incidents-table-view";
import { getCenterContext } from "@/lib/center-context";
import { getCurrentUser } from "@/lib/auth";
import { canReportIncidents } from "@/lib/incidents/permissions";
import { getIncidentDashboard } from "@/lib/data/incident-dashboard";
import { INCIDENT_SEVERITIES, humaniseHours } from "@/lib/incidents/constants";
import { cn, formatDate, pluralize } from "@/lib/utils";

export const metadata = { title: "Incidents overview" };

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
  href,
}: {
  icon: typeof Siren;
  label: string;
  value: number;
  sub?: string;
  tone?: "default" | "critical" | "medium";
  href: string;
}) {
  const toneCls =
    tone === "critical"
      ? "text-critical"
      : tone === "medium"
        ? "text-medium"
        : "text-ink";
  return (
    <Link
      href={href}
      className="group rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs transition-colors hover:border-line-strong"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="size-4 text-faint" />
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tnum", toneCls)}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub ?? " "}</p>
    </Link>
  );
}

export default async function IncidentsOverviewPage() {
  const { selected, selectedId } = await getCenterContext();
  const user = await getCurrentUser();
  const d = await getIncidentDashboard(selectedId);
  const canReport = canReportIncidents(user);

  const severityData = INCIDENT_SEVERITIES.map((s) => ({
    label: s.label,
    value: s.value,
    count: d.severityCounts[s.value] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Incidents overview"
        description="Incident reporting at a glance — what's open, what's overdue, and where incidents cluster."
        actions={
          canReport ? (
            <Link href="/incidents/new" className={buttonClasses()}>
              <Plus className="size-4" /> Report incident
            </Link>
          ) : undefined
        }
      />

      {d.total === 0 ? (
        <EmptyState
          icon={Siren}
          title="No incidents yet"
          description="Report your first incident to start building the picture — trends, hotspots and follow-up actions."
          action={
            canReport ? (
              <Link href="/incidents/new" className={buttonClasses()}>
                Report incident
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi
              icon={Siren}
              label="Incidents"
              value={d.stats.total}
              sub="Reported (excl. drafts)"
              href="/incidents/list"
            />
            <Kpi
              icon={FolderOpen}
              label="Open"
              value={d.stats.open}
              tone={d.stats.open > 0 ? "medium" : "default"}
              sub={d.stats.open > 0 ? "Awaiting close-out" : "All resolved"}
              href="/incidents/list"
            />
            <Kpi
              icon={CalendarX}
              label="Overdue actions"
              value={d.stats.overdueActions}
              tone={d.stats.overdueActions > 0 ? "critical" : "default"}
              sub={d.stats.overdueActions > 0 ? "Needs attention" : "On track"}
              href="/incidents/actions"
            />
            <Kpi
              icon={TriangleAlert}
              label="High-severity open"
              value={d.stats.reportableOpen}
              tone={d.stats.reportableOpen > 0 ? "critical" : "default"}
              sub="Major / critical outcome"
              href="/incidents/list"
            />
            <Kpi
              icon={UserRound}
              label="People injured"
              value={d.stats.injured}
              sub="Across reported incidents"
              href="/incidents/list"
            />
          </div>

          {/* Awaiting triage */}
          {d.awaitingTriageTotal > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hourglass className="size-4 text-medium" /> Awaiting triage
                  <span className="font-normal text-muted-foreground tnum">
                    {d.awaitingTriageTotal}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-4">
                  {d.stats.avgReportGapHours != null && (
                    <span className="text-xs text-muted-foreground">
                      Avg report gap{" "}
                      <span className="font-medium text-ink tnum">
                        {humaniseHours(d.stats.avgReportGapHours)}
                      </span>
                    </span>
                  )}
                  <Link
                    href="/incidents/triage"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Triage queue <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <ul className="divide-y divide-line">
                {d.awaitingTriageQueue.map((inc) => (
                  <li key={inc.id}>
                    <Link
                      href={`/incidents/${inc.id}/triage`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink">
                          <span className="font-mono text-xs">{inc.reference}</span> · {inc.location}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <IncidentTypeBadge type={inc.type} />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(inc.occurredAt)}
                          </span>
                        </div>
                      </div>
                      <TriageAgeBadge since={inc.waitingSince} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Needs attention */}
          {(d.overdueActions.length > 0 || d.reportableOpen.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleAlert className="size-4 text-critical" /> Overdue actions
                  </CardTitle>
                  <Link
                    href="/incidents/actions"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    All actions <ArrowRight className="size-3.5" />
                  </Link>
                </CardHeader>
                <ul className="divide-y divide-line">
                  {d.overdueActions.map((a) => (
                    <li key={a.incidentId + a.description}>
                      <Link
                        href={`/incidents/${a.incidentId}`}
                        className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-surface-2/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ink">{a.description}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{a.reference}</span> · {a.assignedTo}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-critical tnum">
                          {a.daysOverdue}d overdue
                        </span>
                      </Link>
                    </li>
                  ))}
                  {d.overdueActions.length === 0 && (
                    <li className="px-5 py-6 text-center text-sm text-muted-foreground">
                      No overdue actions.
                    </li>
                  )}
                </ul>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TriangleAlert className="size-4 text-high" /> High-severity, still open
                  </CardTitle>
                  <Link
                    href="/incidents/list"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    All incidents <ArrowRight className="size-3.5" />
                  </Link>
                </CardHeader>
                <ul className="divide-y divide-line">
                  {d.reportableOpen.map((inc) => (
                    <li key={inc.id}>
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ink">
                            <span className="font-mono text-xs">{inc.reference}</span> · {inc.location}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(inc.occurredAt)} · {inc.openActions}{" "}
                            {pluralize(inc.openActions, "open action")}
                          </p>
                        </div>
                        <SeverityBadge severity={inc.severity} />
                      </Link>
                    </li>
                  ))}
                  {d.reportableOpen.length === 0 && (
                    <li className="px-5 py-6 text-center text-sm text-muted-foreground">
                      Nothing high-severity open.
                    </li>
                  )}
                </ul>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Incidents over time</CardTitle>
                <span className="text-xs text-muted-foreground">Last 6 months</span>
              </CardHeader>
              <div className="p-4">
                <IncidentActivityChart data={d.activity} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By type</CardTitle>
              </CardHeader>
              <div className="p-4">
                <IncidentTypeChart data={d.typeCounts} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By severity</CardTitle>
              </CardHeader>
              <div className="p-4">
                <IncidentSeverityChart data={severityData} />
              </div>
            </Card>
          </div>

          {/* Recent */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Recent incidents</h2>
              <Link
                href="/incidents/list"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                All incidents <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <IncidentsTableView rows={d.recent} showCenter={!selected} compact />
          </section>
        </>
      )}
    </div>
  );
}
