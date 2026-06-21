import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { IncidentForm } from "@/components/incidents/incident-form";
import { requireCapability, can } from "@/lib/auth";
import { getCenterContext } from "@/lib/center-context";
import { getAreaOptions, getIncidentDetail, getReporterOptions } from "@/lib/data/incidents";

export const metadata = { title: "Edit incident" };

export default async function EditIncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCapability("manageIncidents");
  const incident = await getIncidentDetail(id);
  if (!incident) notFound();

  const { centers } = await getCenterContext();
  const isAdmin = can(user, "admin");
  const [areaOptions, reporterOptions] = await Promise.all([
    getAreaOptions(null),
    isAdmin ? getReporterOptions() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/incidents/${incident.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to incident
        </Link>
        <PageHeader
          eyebrow={incident.reference}
          title="Edit incident"
          description="Update the incident details. People involved and follow-up actions are managed on the incident page."
        />
      </div>

      <IncidentForm
        mode="edit"
        centers={centers}
        areaOptions={areaOptions}
        isAdmin={isAdmin}
        reporterOptions={reporterOptions}
        defaultValues={{
          id: incident.id,
          centerId: incident.centerId,
          type: incident.type,
          severity: incident.severity,
          occurredAt: format(incident.occurredAt, "yyyy-MM-dd'T'HH:mm"),
          areaId: incident.areaId ?? "",
          subAreaId: incident.subAreaId ?? "",
          description: incident.description,
          immediateAction: incident.immediateAction ?? "",
          reportedById: incident.reportedById ?? "",
        }}
      />
    </div>
  );
}
