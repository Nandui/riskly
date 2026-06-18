import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import {
  getAssessmentDetail,
  getAssessmentFormData,
  assessmentTitle,
} from "@/lib/data/assessments";
import { updateAssessment } from "@/lib/actions/assessments";
import { toDateInputValue } from "@/lib/utils";
import { requireCapability } from "@/lib/auth";

export const metadata = { title: "Edit assessment" };

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("editContent");
  const { id } = await params;
  const [a, form] = await Promise.all([
    getAssessmentDetail(id),
    getAssessmentFormData(),
  ]);
  if (!a) notFound();

  const subjectId =
    a.subjectType === "Role"
      ? (a.roleId ?? "")
      : a.subjectType === "Activity"
        ? (a.activityId ?? "")
        : (a.areaId ?? "");

  const defaults = {
    description: a.description ?? "",
    centerId: a.centerId,
    subjectType: a.subjectType,
    subjectId,
    status: a.status,
    assessorName: a.assessorName ?? "",
    assessmentDate: toDateInputValue(a.assessmentDate),
    reviewFrequencyMonths: a.reviewFrequencyMonths,
    hazards: a.hazards.map((h) => ({
      key: h.id,
      hazard: h.hazard,
      riskFactor: h.riskFactor ?? "",
      personAtRisk: h.personAtRisk ?? "",
      consequence: h.consequence ?? "",
      currentControls: h.currentControls ?? "",
      likelihood: h.likelihood,
      severity: h.severity,
      riskCategory: h.riskCategory,
    })),
    ownerId: a.ownerId ?? "",
    departmentId: a.departmentId ?? "",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/assessments/${a.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to assessment
        </Link>
        <PageHeader
          eyebrow={`Edit · ${a.reference}`}
          title={assessmentTitle(a)}
        />
      </div>

      <AssessmentForm
        action={updateAssessment.bind(null, a.id)}
        submitLabel="Save changes"
        centers={form.centers}
        areasByCenter={form.areasByCenter}
        roles={form.roles}
        activities={form.activities}
        users={form.users.map((u) => ({
          id: u.id,
          name: u.name ?? u.email ?? "Unknown user",
        }))}
        departments={form.departments}
        takenAreaIds={form.assessedAreaIds.filter(
          (id) => id !== (a.areaId ?? ""),
        )}
        defaults={defaults}
        cancelHref={`/assessments/${a.id}`}
      />
    </div>
  );
}
