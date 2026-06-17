import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import {
  getAssessmentDetail,
  getAssessmentFormData,
} from "@/lib/data/assessments";
import { updateAssessment } from "@/lib/actions/assessments";
import { toDateInputValue } from "@/lib/utils";

export const metadata = { title: "Edit assessment" };

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [a, form] = await Promise.all([
    getAssessmentDetail(id),
    getAssessmentFormData(),
  ]);
  if (!a) notFound();

  const defaults = {
    title: a.title,
    description: a.description ?? "",
    centerId: a.centerId,
    areaId: a.areaId,
    roleId: a.roleId ?? "",
    activityId: a.activityId ?? "",
    status: a.status,
    assessorName: a.assessorName ?? "",
    approvedByName: a.approvedByName ?? "",
    assessmentDate: toDateInputValue(a.assessmentDate),
    reviewFrequencyMonths: a.reviewFrequencyMonths,
    hazards: a.hazards.map((h) => ({
      key: h.id,
      hazardDescription: h.hazardDescription,
      whoAtRisk: h.whoAtRisk ?? "",
      existingControls: h.existingControls ?? "",
      initialLikelihood: h.initialLikelihood,
      initialSeverity: h.initialSeverity,
      additionalControls: h.additionalControls ?? "",
      residualLikelihood: h.residualLikelihood,
      residualSeverity: h.residualSeverity,
      actionOwnerName: h.actionOwnerName ?? "",
      actionDueDate: toDateInputValue(h.actionDueDate),
      actionStatus: h.actionStatus,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/assessments/${a.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to assessment
        </Link>
        <PageHeader eyebrow={`Edit · ${a.reference}`} title={a.title} />
      </div>

      <AssessmentForm
        action={updateAssessment.bind(null, a.id)}
        submitLabel="Save changes"
        centers={form.centers}
        areasByCenter={form.areasByCenter}
        roles={form.roles}
        activities={form.activities}
        defaults={defaults}
        cancelHref={`/assessments/${a.id}`}
      />
    </div>
  );
}
