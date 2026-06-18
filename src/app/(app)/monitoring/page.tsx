import {
  CalendarClock,
  TriangleAlert,
  ShieldCheck,
  CircleCheckBig,
  Inbox,
  UserRoundCheck,
  CircleAlert,
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
  getOwnedByMe,
} from "@/lib/data/monitoring";
import { assessmentTitle } from "@/lib/data/assessments";
import { getCurrentUser, can } from "@/lib/auth";
import { formatDate, toDateInputValue } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  const [queue, highRisk, openRequests, ownedByMe] = await Promise.all([
    getReviewQueue(selectedId),
    getHighRiskHazards(selectedId),
    getOpenReviewRequests(selectedId),
    user ? getOwnedByMe(user.id, selectedId) : Promise.resolve([]),
  ]);

  const canReview = can(user, "review");
  const needsAction = ownedByMe.filter((a) => a.status === "UnderReview");

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
  const overdueReviews = items.filter((i) => i.reviewKey === "overdue").length;
  const dueReviews = items.filter((i) => i.reviewKey === "due").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Monitoring"
        description="Keep assessments current and high risks in view. Log a review to roll the next review date forward."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Overdue reviews"
          value={overdueReviews}
          tone={overdueReviews > 0 ? "critical" : "default"}
        />
        <Stat
          label="Reviews due soon"
          value={dueReviews}
          tone={dueReviews > 0 ? "medium" : "default"}
        />
        <Stat
          label="Open review requests"
          value={requestItems.length}
          tone={requestItems.length > 0 ? "medium" : "default"}
        />
      </div>

      {needsAction.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CircleAlert className="size-4 text-medium" /> Needs your action
            <span className="font-normal tnum text-muted-foreground">
              {needsAction.length}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Assessments you own that have changed and are back under review —
            re-check them and get them re-approved.
          </p>
          <AssessmentTable rows={needsAction} showCenter={!selected} />
        </section>
      )}

      {ownedByMe.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <UserRoundCheck className="size-4 text-muted-foreground" /> Owned by me
            <span className="font-normal tnum text-muted-foreground">
              {ownedByMe.length}
            </span>
          </h2>
          <AssessmentTable rows={ownedByMe} showCenter={!selected} />
        </section>
      )}

      {canReview && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Inbox className="size-4 text-muted-foreground" /> Review requests
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
      )}

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
          <ReviewQueue
            items={items}
            todayInput={todayInput}
            canReview={canReview}
          />
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
