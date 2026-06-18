import {
  UserCheck,
  CalendarDays,
  RefreshCw,
  History,
  ShieldCheck,
  FilePlus2,
  Pencil,
  Upload,
  Undo2,
  CircleCheck,
  MessageSquarePlus,
  CheckCheck,
  Dot,
  type LucideIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { CategoryBadge } from "@/components/ui/badge";
import { ReviewChip } from "@/components/ui/review-chip";
import {
  ApproveButton,
  WithdrawApprovalButton,
} from "@/components/assessments/approval-button";
import { summarizeAssessment, type AssessmentDetail } from "@/lib/data/assessments";
import { formatDate, formatDateTime } from "@/lib/utils";
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
        <dt className="text-xs text-muted-foreground">{label}</dt>
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

const ACTION_META: Record<string, { label: string; Icon: LucideIcon }> = {
  created: { label: "Created", Icon: FilePlus2 },
  updated: { label: "Edited", Icon: Pencil },
  imported: { label: "Imported", Icon: Upload },
  approved: { label: "Approved", Icon: ShieldCheck },
  approval_revoked: { label: "Approval withdrawn", Icon: Undo2 },
  review_logged: { label: "Review logged", Icon: CircleCheck },
  review_requested: { label: "Review requested", Icon: MessageSquarePlus },
  review_request_resolved: {
    label: "Review request resolved",
    Icon: CheckCheck,
  },
};

export function AssessmentView({
  assessment: a,
  canApprove,
}: {
  assessment: AssessmentDetail;
  canApprove: boolean;
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
            <p className="eyebrow mb-1.5">Overall risk</p>
            {summary.headlineBand ? (
              <RiskBadge score={summary.overallScore} band={summary.headlineBand} />
            ) : (
              <span className="text-sm text-faint">No hazards rated</span>
            )}
          </div>
          <div>
            <p className="eyebrow mb-1.5">Next review</p>
            <ReviewChip review={summary.review} />
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(a.nextReviewDate)}
            </p>
          </div>
          <div className="border-t border-line pt-3">
            <p className="eyebrow mb-1.5">Approval</p>
            {a.approvedByName ? (
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-strong">
                  <ShieldCheck className="size-3.5" /> Approved
                </span>
                <p className="mt-1.5 text-sm font-medium text-ink">
                  {a.approvedByName}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(a.approvedAt)}</p>
                {canApprove && (
                  <div className="no-print mt-2">
                    <WithdrawApprovalButton id={a.id} />
                  </div>
                )}
              </div>
            ) : canApprove ? (
              <div className="no-print">
                <ApproveButton id={a.id} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet approved</p>
            )}
          </div>
          <div className="flex gap-5 border-t border-line pt-3 text-sm">
            <div>
              <p className="text-lg font-semibold tnum text-ink">
                {summary.hazardCount}
              </p>
              <p className="text-xs text-muted-foreground">hazards</p>
            </div>
            <div>
              <p
                className={`text-lg font-semibold tnum ${summary.highRiskCount > 0 ? "text-critical" : "text-ink"}`}
              >
                {summary.highRiskCount}
              </p>
              <p className="text-xs text-muted-foreground">high risk</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">
          Hazards &amp; controls
          <span className="ml-2 font-normal tnum text-muted-foreground">
            {summary.hazardCount}
          </span>
        </h2>

        {a.hazards.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted-foreground">
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
                    {h.hazard}
                  </h3>
                  <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
                    <CategoryBadge category={h.riskCategory} />
                    <RiskBadge score={riskScore(h.likelihood, h.severity)} size="sm" />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Block label="Risk factor" value={h.riskFactor} />
                  <Block label="Person at risk" value={h.personAtRisk} />
                  <Block label="Consequence" value={h.consequence} />
                  <Block label="Current controls" value={h.currentControls} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {a.reviewLogs.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <History className="size-4 text-muted-foreground" /> Review history
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
                  <span className="text-muted-foreground"> · {outcomeLabel(r.outcome)}</span>
                  {r.reviewerName && (
                    <span className="text-muted-foreground"> · {r.reviewerName}</span>
                  )}
                  {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                </div>
                <span className="text-xs text-muted-foreground">
                  next {formatDate(r.nextReviewDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.auditLogs.length > 0 && (
        <section className="space-y-3 print-break-avoid">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <History className="size-4 text-muted-foreground" /> Activity
          </h2>
          <ul className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
            {a.auditLogs.map((e) => {
              const meta = ACTION_META[e.action] ?? {
                label: e.action,
                Icon: Dot,
              };
              return (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
                    <meta.Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink">
                      <span className="font-medium">{meta.label}</span>
                      {e.detail && (
                        <span className="text-muted-foreground"> — {e.detail}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.userName ?? "System"} · {formatDateTime(e.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
