import Link from "next/link";
import {
  CalendarClock,
  TriangleAlert,
  ShieldCheck,
  CircleCheckBig,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge } from "@/components/ui/risk-badge";
import { CategoryBadge } from "@/components/ui/badge";
import { ReviewQueue, type ReviewItem } from "@/components/monitoring/review-queue";
import { getCenterContext } from "@/lib/center-context";
import { getReviewQueue, getHighRiskHazards } from "@/lib/data/monitoring";
import { assessmentTitle } from "@/lib/data/assessments";
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
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tnum", toneCls)}>{value}</p>
    </div>
  );
}

export default async function MonitoringPage() {
  const { selected, selectedId } = await getCenterContext();
  const [queue, highRisk] = await Promise.all([
    getReviewQueue(selectedId),
    getHighRiskHazards(selectedId),
  ]);

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
    residualScore: a.summary.headlineBand ? a.summary.maxRiskScore : null,
    residualBand: a.summary.headlineBand,
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
          label="High-risk hazards"
          value={highRisk.length}
          tone={highRisk.length > 0 ? "critical" : "default"}
        />
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarClock className="size-4 text-muted" /> Reviews due
          <span className="font-normal tnum text-muted">{items.length}</span>
        </h2>
        {items.length === 0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title="All reviews up to date"
            description="No assessments are overdue or due for review in this scope."
          />
        ) : (
          <ReviewQueue items={items} todayInput={todayInput} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <TriangleAlert className="size-4 text-muted" /> High &amp; very high risk
          <span className="font-normal tnum text-muted">{highRisk.length}</span>
        </h2>
        {highRisk.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No high-risk hazards"
            description="Every hazard in scope is rated Low or Medium."
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
            {highRisk.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/assessments/${h.assessment.id}`}
                  className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{h.hazard}</p>
                    <p className="text-xs text-muted">
                      <span className="font-mono text-faint">
                        {h.assessment.reference}
                      </span>{" "}
                      · {h.assessment.center.name} ·{" "}
                      {assessmentTitle(h.assessment)}
                      {h.personAtRisk ? ` · ${h.personAtRisk}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <CategoryBadge category={h.riskCategory} />
                    <RiskBadge score={h.score} band={h.band} size="sm" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
