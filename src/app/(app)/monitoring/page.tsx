import Link from "next/link";
import {
  CalendarClock,
  TriangleAlert,
  ShieldCheck,
  CircleCheckBig,
  Inbox,
  UserRoundCheck,
  CircleAlert,
  Send,
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
  getAwaitingCeoApproval,
  getMyReviewRequests,
} from "@/lib/data/monitoring";
import { assessmentTitle } from "@/lib/data/assessments";
import { getCurrentUser, can } from "@/lib/auth";
import { formatDate, toDateInputValue } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Monitoring" };

// Read-only state pills for a review request a user has raised.
const REQUEST_STATE: Record<string, { label: string; pill: string }> = {
  Open: { label: "Open", pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  Actioned: {
    label: "Actioned",
    pill: "bg-brand-soft text-brand-strong border border-brand/25",
  },
  Dismissed: {
    label: "Dismissed",
    pill: "bg-slate-100 text-slate-500 border border-slate-200",
  },
};

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
  const canApprove = can(user, "approveAssessments");
  const canRequest = can(user, "requestReview");
  const [queue, highRisk, openRequests, ownedByMe, awaitingCeo, myRequests] =
    await Promise.all([
      getReviewQueue(selectedId),
      getHighRiskHazards(selectedId),
      getOpenReviewRequests(selectedId),
      user ? getOwnedByMe(user.id, selectedId) : Promise.resolve([]),
      canApprove ? getAwaitingCeoApproval(selectedId) : Promise.resolve([]),
      user && canRequest
        ? getMyReviewRequests(user.id, selectedId)
        : Promise.resolve([]),
    ]);

  const canReview = can(user, "review");
  // Active (open) requests first, then resolved by most recent.
  const myRequestsSorted = [...myRequests].sort(
    (a, b) =>
      (a.status === "Open" ? 0 : 1) - (b.status === "Open" ? 0 : 1) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const myOpenRequests = myRequests.filter((r) => r.status === "Open").length;
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

      <div
        className={cn(
          "grid gap-3",
          canApprove ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
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
        {canApprove && (
          <Stat
            label="Awaiting CEO approval"
            value={awaitingCeo.length}
            tone={awaitingCeo.length > 0 ? "medium" : "default"}
          />
        )}
      </div>

      {canApprove && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck className="size-4 text-medium" /> Awaiting CEO approval
            <span className="font-normal tnum text-muted-foreground">
              {awaitingCeo.length}
            </span>
          </h2>
          {awaitingCeo.length === 0 ? (
            <EmptyState
              icon={CircleCheckBig}
              title="Nothing awaiting your approval"
              description="Every in-force or under-review assessment has the CEO sign-off."
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Assessments still without the CEO sign-off. Open one to review it
                and grant your approval.
              </p>
              <AssessmentTable rows={awaitingCeo} showCenter={!selected} />
            </>
          )}
        </section>
      )}

      {canRequest && myRequestsSorted.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Send className="size-4 text-muted-foreground" /> Your review requests
            <span className="font-normal tnum text-muted-foreground">
              {myOpenRequests > 0
                ? `${myOpenRequests} open`
                : myRequestsSorted.length}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Review requests you&apos;ve raised and where they stand.
          </p>
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
            <ul className="divide-y divide-line">
              {myRequestsSorted.map((r) => {
                const meta = REQUEST_STATE[r.status] ?? REQUEST_STATE.Open;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/assessments/${r.assessment.id}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-surface-2/60"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.assessment.reference}
                          </span>{" "}
                          · {assessmentTitle(r.assessment)}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {r.notes}
                        </p>
                        {r.status !== "Open" && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {meta.label}
                            {r.resolvedAt ? ` ${formatDate(r.resolvedAt)}` : ""}
                            {r.resolvedBy
                              ? ` by ${r.resolvedBy.name ?? r.resolvedBy.email}`
                              : ""}
                            {r.resolutionNote ? ` — ${r.resolutionNote}` : ""}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          meta.pill,
                        )}
                      >
                        {meta.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

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
