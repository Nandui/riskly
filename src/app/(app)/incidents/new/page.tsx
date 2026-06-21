import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { IncidentCaptureWizard } from "@/components/incidents/incident-capture-wizard";
import { requireCapability, can } from "@/lib/auth";
import { getCenterContext } from "@/lib/center-context";
import { getAreaOptions, getReporterOptions } from "@/lib/data/incidents";

export const metadata = { title: "Report an incident" };

export default async function NewIncidentPage() {
  const user = await requireCapability("reportIncidents");
  const { centers, selectedId } = await getCenterContext();
  const isAdmin = can(user, "admin");
  const [areaOptions, reporterOptions] = await Promise.all([
    getAreaOptions(null),
    isAdmin ? getReporterOptions() : Promise.resolve([]),
  ]);

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
          title="Report an incident"
          description="A few quick steps — what, where, what happened, and whether anyone was hurt. You can save a draft and finish later; detail and follow-up actions are added during the investigation."
        />
      </div>

      <IncidentCaptureWizard
        centers={centers}
        areaOptions={areaOptions}
        isAdmin={isAdmin}
        reporterOptions={reporterOptions}
        defaultValues={{
          centerId: selectedId ?? centers[0]?.id ?? "",
          occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          reportedById: user.id,
        }}
      />
    </div>
  );
}
