import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import {
  getAssessmentFormData,
  getAssessmentDetail,
} from "@/lib/data/assessments";
import { getCenterContext } from "@/lib/center-context";
import { createAssessment } from "@/lib/actions/assessments";
import { toDateInputValue } from "@/lib/utils";
import { requireCapability } from "@/lib/auth";

export const metadata = { title: "New assessment" };
// AI hazard drafting runs as a server action from this route — give it room.
export const maxDuration = 60;

export default async function NewAssessmentPage({
  searchParams,
}: {
  // `?from={id}` seeds the form from an existing assessment (Duplicate), copying
  // its hazards, scope and cadence so the user picks a new subject and creates.
  searchParams: Promise<{ from?: string }>;
}) {
  await requireCapability("editContent");
  const { from } = await searchParams;
  const [form, { selected }, source] = await Promise.all([
    getAssessmentFormData(),
    getCenterContext(),
    from ? getAssessmentDetail(from) : Promise.resolve(null),
  ]);

  if (form.centers.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader eyebrow="New assessment" title="Create assessment" />
        <EmptyState
          icon={Building2}
          title="Add a centre first"
          description="Assessments belong to a centre. Create at least one active centre before adding assessments."
          action={
            <Link href="/centers/new" className={buttonClasses()}>
              Add a centre
            </Link>
          }
        />
      </div>
    );
  }

  const duplicating = source != null;
  const hazardCount = source?.hazards.length ?? 0;

  const defaults = {
    description: source?.description ?? "",
    centerId: selected?.id ?? form.centers[0].id,
    // Pre-set the subject type to the source's, but leave the subject empty —
    // it must be a different, unassessed one (one assessment per subject).
    subjectType: source?.subjectType ?? "Area",
    subjectId: "",
    status: "Draft",
    assessorName: "",
    assessmentDate: toDateInputValue(new Date()),
    reviewFrequencyMonths: source?.reviewFrequencyMonths ?? 12,
    hazards: source
      ? source.hazards.map((h) => ({
          key: h.id,
          hazard: h.hazard,
          riskFactor: h.riskFactor ?? "",
          personAtRisk: h.personAtRisk ?? "",
          consequence: h.consequence ?? "",
          currentControls: h.currentControls ?? "",
          likelihood: h.likelihood,
          severity: h.severity,
          riskCategory: h.riskCategory,
        }))
      : [],
    ownerId: "",
    departmentId: "",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={duplicating ? `/assessments/${source!.id}` : "/assessments"}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" />{" "}
          {duplicating ? "Back to assessment" : "Assessments"}
        </Link>
        <PageHeader
          eyebrow={duplicating ? `From ${source!.reference}` : "New assessment"}
          title={duplicating ? "Duplicate assessment" : "Create assessment"}
          description={
            duplicating
              ? `${hazardCount} hazard${hazardCount === 1 ? "" : "s"} copied — choose a centre and an unassessed ${(source!.subjectType).toLowerCase()} (or switch type), review the hazards, then create.`
              : undefined
          }
        />
      </div>

      <AssessmentForm
        action={createAssessment}
        submitLabel={duplicating ? "Create duplicate" : "Create assessment"}
        centers={form.centers}
        areasByCenter={form.areasByCenter}
        roles={form.roles}
        activities={form.activities}
        users={form.users.map((u) => ({
          id: u.id,
          name: u.name ?? u.email ?? "Unknown user",
        }))}
        departments={form.departments}
        takenAreaIds={form.assessedAreaIds}
        takenRoleIds={form.assessedRoleIds}
        takenActivityIds={form.assessedActivityIds}
        defaults={defaults}
        cancelHref={duplicating ? `/assessments/${source!.id}` : "/assessments"}
      />
    </div>
  );
}
