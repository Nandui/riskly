import {
  CalendarClock,
  TriangleAlert,
  ShieldCheck,
  CircleCheckBig,
  Inbox,
  Loader,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewQueue, type ReviewItem } from "@/components/monitoring/review-queue";
import { OpenRequests } from "@/components/monitoring/open-requests";
import { HighRiskTable } from "@/components/monitoring/high-risk-table";
import { AssessmentTable } from "@/components/assessments/assessment-table";
import { getCenterContext } from "@/lib/center-context";
import {
  getReviewQueue,
  getHighRiskHazards,
  getOpenReviewRequests,
  getUnderReview,
} from "@/lib/data/monitoring";
import { assessmentTitle } from "@/lib/data/assessments";
import { getCurrentUser, can } from "@/lib/auth";
import { formatDate, toDateInputValue, cn } from "@/lib/utils";

export const metadata = { title: "Monitoring" };

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "critical" | "medium";
}) {
  const toneCls =
    tone === "critical"
      ? "text-critical"
      : tone === "medium"
        ? "text-medium"
        : "text-ink";
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tnum", toneCls)}>{value}</p>
    </div>
  );
}

export default async function MonitoringPage() {
  const { selected, selectedId } = await getCenterContext();
  const user = await getCurrentUser();
  const [queue, underReview, highRisk, openRequests] = await Promise.all([
    getReviewQueue(selectedId),
    getUnderReview(selectedId),
    getHighRiskHazards(selectedId),
    getOpenReviewRequests(selectedId),
  ]);

  const canReview = can(user, "review");

  const items: ReviewItem[] = queue.map((a) => ({
    id: a.id,
    reference: a.reference,
    title: a.title,
    centerName: a.center.name,
    subjectType: a.subjectType,
    status: a.status,
    reviewKey: a.summary.review.key === "overdue" ? "overdue" : "due",
    reviewLabel: a.summary.review.label,
    nextReviewDate: formatDate(a.nextReviewDate),
    residualScore: a.summary.headlineBand ? a.summary.overallScore : null,
    residualBand: a.summary.headlineBand,
  }));

  const requestItems = openRequests.map((r) => ({
    id: r.id,
    notes: r.notes,
    requestedBy: r.requestedBy?.name ?? r.requestedBy?.email ?? "Someone",
    createdAt: formatDate(r.createdAt),
    assessmentId: r.assessment.id,
    reference: r.assessment.reference,
    title: assessmentTitle(r.assessment),
    centerName: r.assessment.center.name,
  }));

  const highRiskRows = highRisk.map((h) => ({
    id: h.id,
    hazard: h.hazard,
    category: h.riskCategory,
    score: h.score,
    band: h.band,
    personAtRisk: h.personAtRisk,
    assessmentId: h.assessment.id,
    reference: h.assessment.reference,
    centerName: h.assessment.center.name,
    subjectTitle: assessmentTitle(h.assessment),
  }));

  const todayInput = toDateInputValue(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Monitoring"
        description="Awareness of what's happening to your assessments and hazards — reviews coming due, what's under review, where risk is high, and open requests."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Reviews due soon"
          value={items.length}
          tone={items.length > 0 ? "medium" : "default"}
        />
        <Stat
          label="Under review"
          value={underReview.length}
          tone={underReview.length > 0 ? "medium" : "default"}
        />
        <Stat
          label="Open review requests"
          value={requestItems.length}
          tone={requestItems.length > 0 ? "medium" : "default"}
        />
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarClock className="size-4 text-muted-foreground" /> Reviews due
          <span className="font-normal tnum text-muted-foreground">{items.length}</span>
        </h2>
        {items.length === 0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title="All reviews up to date"
            description="No assessments are overdue or due for review in this scope."
          />
        ) : (
          <ReviewQueue items={items} todayInput={todayInput} canReview={canReview} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Loader className="size-4 text-muted-foreground" /> Under review
          <span className="font-normal tnum text-muted-foreground">
            {underReview.length}
          </span>
        </h2>
        {underReview.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing is currently under review.
          </div>
        ) : (
          <AssessmentTable rows={underReview} showCenter={!selected} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Inbox className="size-4 text-muted-foreground" /> Open review requests
          <span className="font-normal tnum text-muted-foreground">
            {requestItems.length}
          </span>
        </h2>
        {requestItems.length === 0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title="No open requests"
            description="No one has requested a review in this scope."
          />
        ) : (
          <OpenRequests items={requestItems} canResolve={canReview} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <TriangleAlert className="size-4 text-muted-foreground" /> High &amp; very high risk
          <span className="font-normal tnum text-muted-foreground">{highRisk.length}</span>
        </h2>
        {highRisk.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No high-risk hazards"
            description="Every hazard in scope is rated Low or Medium."
          />
        ) : (
          <HighRiskTable rows={highRiskRows} showCenter={!selected} />
        )}
      </section>
    </div>
  );
}
