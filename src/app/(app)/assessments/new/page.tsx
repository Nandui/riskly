import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { getAssessmentFormData } from "@/lib/data/assessments";
import { getCenterContext } from "@/lib/center-context";
import { createAssessment } from "@/lib/actions/assessments";
import { toDateInputValue } from "@/lib/utils";
import { requireCapability } from "@/lib/auth";

export const metadata = { title: "New assessment" };

export default async function NewAssessmentPage() {
  await requireCapability("editContent");
  const [form, { selected }] = await Promise.all([
    getAssessmentFormData(),
    getCenterContext(),
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

  const defaults = {
    description: "",
    centerId: selected?.id ?? form.centers[0].id,
    subjectType: "Area",
    subjectId: "",
    status: "Draft",
    assessorName: "",
    assessmentDate: toDateInputValue(new Date()),
    reviewFrequencyMonths: 12,
    hazards: [],
    ownerId: "",
    departmentId: "",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/assessments"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Assessments
        </Link>
        <PageHeader eyebrow="New assessment" title="Create assessment" />
      </div>

      <AssessmentForm
        action={createAssessment}
        submitLabel="Create assessment"
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
        defaults={defaults}
        cancelHref="/assessments"
      />
    </div>
  );
}
