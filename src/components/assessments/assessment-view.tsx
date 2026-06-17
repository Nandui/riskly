import {
  ArrowRight,
  UserCheck,
  CalendarDays,
  RefreshCw,
  History,
  ShieldCheck,
} from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { ActionBadge } from "@/components/ui/badge";
import { ReviewChip } from "@/components/ui/review-chip";
import { summarizeAssessment, type AssessmentDetail } from "@/lib/data/assessments";
import { formatDate } from "@/lib/utils";
import { riskScore } from "@/lib/risk";
import { REVIEW_FREQUENCY_OPTIONS, REVIEW_OUTCOMES } from "@/lib/constants";

function frequencyLabel(months: number) {
  return (
    REVIEW_FREQUENCY_OPTIONS.find((o) => o.value === months)?.label ??
    `Every ${months} months`
  );
}

function outcomeLabel(value: string) {
  return REVIEW_OUTCOMES.find((o) => o.value === value)?.label ?? value;
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-faint" />
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-sm font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="whitespace-pre-line text-sm text-ink-soft">
        {value || <span className="text-faint">—</span>}
      </p>
    </div>
  );
}

export function AssessmentView({
  assessment: a,
}: {
  assessment: AssessmentDetail;
}) {
  const summary = summarizeAssessment(a);

  return (
    <div className="space-y-5">
      <section className="grid gap-6 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs sm:p-6 lg:grid-cols-3 print-break-avoid">
        <div className="lg:col-span-2">
          <p className="eyebrow mb-1.5">Scope</p>
          <p className="whitespace-pre-line text-sm text-ink-soft">
            {a.description || (
              <span className="text-faint">No description provided.</span>
            )}
          </p>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact icon={UserCheck} label="Assessed by">
              {a.assessorName || "—"}
            </Fact>
            <Fact icon={ShieldCheck} label="Approved by">
              {a.approvedByName || "—"}
            </Fact>
            <Fact icon={CalendarDays} label="Assessment date">
              {formatDate(a.assessmentDate)}
            </Fact>
            <Fact icon={RefreshCw} label="Review frequency">
              {frequencyLabel(a.reviewFrequencyMonths)}
            </Fact>
          </dl>
        </div>

        <div className="space-y-4 rounded-lg border border-line bg-surface-2/50 p-4">
          <div>
            <p className="eyebrow mb-1.5">Residual risk</p>
            {summary.headlineBand ? (
              <RiskBadge
                score={summary.maxResidualScore}
                band={summary.headlineBand}
              />
            ) : (
              <span className="text-sm text-faint">No hazards rated</span>
            )}
          </div>
          <div>
            <p className="eyebrow mb-1.5">Next review</p>
            <ReviewChip review={summary.review} />
            <p className="mt-1 text-xs text-muted">
              {formatDate(a.nextReviewDate)}
            </p>
          </div>
          <div className="flex gap-5 border-t border-line pt-3 text-sm">
            <div>
              <p className="text-lg font-semibold tnum text-ink">
                {summary.hazardCount}
              </p>
              <p className="text-xs text-muted">hazards</p>
            </div>
            <div>
              <p
                className={`text-lg font-semibold tnum ${summary.overdueActions > 0 ? "text-critical" : "text-ink"}`}
              >
                {summary.openActions}
              </p>
              <p className="text-xs text-muted">open actions</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">
          Hazards &amp; controls
          <span className="ml-2 font-normal tnum text-muted">
            {summary.hazardCount}
          </span>
        </h2>

        {a.hazards.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted">
            No hazards recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {a.hazards.map((h, i) => (
              <div
                key={h.id}
                className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs sm:p-5 print-break-avoid"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="flex items-start gap-2 font-medium text-ink">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-xs font-bold tnum text-brand">
                      {i + 1}
                    </span>
                    {h.hazardDescription}
                  </h3>
                  <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
                    <RiskBadge
                      score={riskScore(h.initialLikelihood, h.initialSeverity)}
                      size="sm"
                    />
                    <ArrowRight className="size-4 text-faint" />
                    <RiskBadge
                      score={riskScore(
                        h.residualLikelihood,
                        h.residualSeverity,
                      )}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Block label="Who might be harmed" value={h.whoAtRisk} />
                  <Block label="Existing controls" value={h.existingControls} />
                  <Block
                    label="Additional controls"
                    value={h.additionalControls}
                  />
                  <div>
                    <p className="eyebrow mb-1">Action</p>
                    {h.actionOwnerName || h.actionStatus !== "NA" ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                        {h.actionOwnerName && <span>{h.actionOwnerName}</span>}
                        {h.actionDueDate && (
                          <span className="text-muted">
                            due {formatDate(h.actionDueDate)}
                          </span>
                        )}
                        <ActionBadge status={h.actionStatus} />
                      </div>
                    ) : (
                      <span className="text-sm text-faint">—</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {a.reviewLogs.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <History className="size-4 text-muted" /> Review history
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {a.reviewLogs.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">
                    {formatDate(r.reviewedDate)}
                  </span>
                  <span className="text-muted"> · {outcomeLabel(r.outcome)}</span>
                  {r.reviewerName && (
                    <span className="text-muted"> · {r.reviewerName}</span>
                  )}
                  {r.notes && (
                    <p className="text-muted">{r.notes}</p>
                  )}
                </div>
                <span className="text-xs text-muted">
                  next {formatDate(r.nextReviewDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
