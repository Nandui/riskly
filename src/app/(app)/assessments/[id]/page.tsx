import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound, Building2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { AssessmentView } from "@/components/assessments/assessment-view";
import { AssessmentActions } from "@/components/assessments/assessment-actions";
import { ReviewRequestPanel } from "@/components/assessments/review-request-panel";
import { getAssessmentDetail, assessmentTitle } from "@/lib/data/assessments";
import { getCurrentUser, can } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAssessmentDetail(id);
  return {
    title: a ? `${a.reference} — ${assessmentTitle(a)}` : "Assessment",
  };
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [a, user] = await Promise.all([
    getAssessmentDetail(id),
    getCurrentUser(),
  ]);
  if (!a) notFound();

  const title = assessmentTitle(a);
  const classification = `${a.center.name} · ${a.subjectType} assessment`;
  const canEdit = can(user, "editContent");

  const requests = a.reviewRequests.map((r) => ({
    id: r.id,
    notes: r.notes,
    status: r.status,
    createdAt: formatDate(r.createdAt),
    requestedBy: r.requestedBy?.name ?? r.requestedBy?.email ?? "Someone",
    resolvedBy: r.resolvedBy?.name ?? r.resolvedBy?.email ?? null,
    resolvedAt: r.resolvedAt ? formatDate(r.resolvedAt) : null,
  }));

  return (
    <div className="space-y-6 print-full">
      <div className="no-print">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Assessments
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print-break-avoid">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-sm text-muted-foreground">{a.reference}</span>
            <StatusBadge status={a.status} />
            {a.owner && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserRound className="size-3.5 text-faint" />
                {a.owner.name ?? a.owner.email}
              </span>
            )}
            {a.department && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="size-3.5 text-faint" />
                {a.department.name}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classification} · Assessed by{" "}
            <span className="font-medium text-ink-soft">
              {a.assessorName || "—"}
            </span>{" "}
            · {formatDate(a.assessmentDate)}
          </p>
          {a.description && (
            <p className="mt-2 max-w-prose text-sm text-ink-soft">
              {a.description}
            </p>
          )}
        </div>
        <div className="no-print">
          <AssessmentActions id={a.id} canEdit={canEdit} />
        </div>
      </div>

      <AssessmentView
        assessment={a}
        canApprove={can(user, "review")}
        canEdit={canEdit}
        canRequest={can(user, "requestReview")}
      />

      <ReviewRequestPanel
        assessmentId={a.id}
        requests={requests}
        canRequest={can(user, "requestReview")}
        canResolve={can(user, "review")}
      />
    </div>
  );
}
