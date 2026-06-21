import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { IncidentTypeBadge } from "@/components/incidents/incident-badges";
import { TriageForm } from "@/components/incidents/triage-form";
import { getCurrentUser } from "@/lib/auth";
import { canTriageIncidents } from "@/lib/incidents/permissions";
import { getIncidentDetail } from "@/lib/data/incidents";
import { AWAITING_TRIAGE_STATUS } from "@/lib/incidents/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Triage incident" };

export default async function TriageIncidentPage({
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

  const backLink = (
    <Link
      href={`/incidents/${incident.id}`}
      className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
    >
      <ArrowLeft className="size-4" /> Back to incident
    </Link>
  );

  if (!canTriageIncidents(user)) {
    return (
      <div>
        {backLink}
        <Card>
          <div className="p-6 text-sm text-muted-foreground">
            You don&apos;t have permission to triage incidents.
          </div>
        </Card>
      </div>
    );
  }

  const location = incident.locationDetail
    ? `${incident.location} — ${incident.locationDetail}`
    : incident.location;

  if (incident.status !== AWAITING_TRIAGE_STATUS) {
    return (
      <div>
        {backLink}
        <Card>
          <div className="space-y-3 p-6">
            <p className="text-sm text-ink">
              <span className="font-mono">{incident.reference}</span> has already
              been triaged.
            </p>
            <Link
              href={`/incidents/${incident.id}`}
              className={buttonClasses({ variant: "secondary" })}
            >
              View the incident
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        {backLink}
        <PageHeader
          eyebrow={incident.reference}
          title="Triage incident"
          description="Confirm the classification, record the actual outcome, and rate the potential risk."
        />
      </div>

      {/* Read-only context for the triaging manager */}
      <Card>
        <CardHeader>
          <CardTitle>What was reported</CardTitle>
          <IncidentTypeBadge type={incident.type} />
        </CardHeader>
        <div className="space-y-4 p-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="eyebrow mb-1">Occurred</dt>
              <dd className="text-sm text-ink">{formatDateTime(incident.occurredAt)}</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Reported</dt>
              <dd className="text-sm text-ink">
                {incident.reportedAt ? formatDateTime(incident.reportedAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Location</dt>
              <dd className="text-sm text-ink">{location}</dd>
            </div>
          </dl>
          <div>
            <dt className="eyebrow mb-1">What happened</dt>
            <dd className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {incident.description}
            </dd>
          </div>
        </div>
      </Card>

      <TriageForm
        incidentId={incident.id}
        defaultType={incident.type}
        defaultSeverity={incident.severity}
      />
    </div>
  );
}
