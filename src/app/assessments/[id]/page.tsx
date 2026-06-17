import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { AssessmentView } from "@/components/assessments/assessment-view";
import { AssessmentActions } from "@/components/assessments/assessment-actions";
import { getAssessmentDetail } from "@/lib/data/assessments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAssessmentDetail(id);
  return { title: a ? `${a.reference} — ${a.title}` : "Assessment" };
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAssessmentDetail(id);
  if (!a) notFound();

  const classification = [
    a.center.name,
    a.area.name,
    a.role?.name,
    a.activity?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6 print-full">
      <div className="no-print">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Assessments
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print-break-avoid">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm text-muted">{a.reference}</span>
            <StatusBadge status={a.status} />
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {a.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{classification}</p>
        </div>
        <div className="no-print">
          <AssessmentActions id={a.id} />
        </div>
      </div>

      <AssessmentView assessment={a} />
    </div>
  );
}
