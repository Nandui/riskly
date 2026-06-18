"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  ChevronDown,
  Check,
  History,
  SlidersHorizontal,
} from "lucide-react";
import { CategoryBadge } from "@/components/ui/badge";
import { ReviewChip } from "@/components/ui/review-chip";
import {
  ApproveButton,
  WithdrawApprovalButton,
} from "@/components/assessments/approval-button";
import { AddHazardButton } from "@/components/assessments/add-hazard-modal";
import { ActivityLogButton } from "@/components/assessments/activity-log-modal";
import { RequestHazardReviewButton } from "@/components/assessments/request-hazard-review-modal";
import type { AssessmentDetail } from "@/lib/data/assessments";
import {
  formatDate,
  formatDateTime,
  reviewStatusFor,
  cn,
} from "@/lib/utils";
import {
  riskScore,
  riskBand,
  BAND_META,
  type RiskBand,
} from "@/lib/risk";
import { REVIEW_FREQUENCY_OPTIONS, REVIEW_OUTCOMES } from "@/lib/constants";

const BANDS_DESC: RiskBand[] = ["veryHigh", "high", "medium", "low"];

function frequencyLabel(months: number) {
  return (
    REVIEW_FREQUENCY_OPTIONS.find((o) => o.value === months)?.label ??
    `Every ${months} months`
  );
}

function outcomeLabel(value: string) {
  return REVIEW_OUTCOMES.find((o) => o.value === value)?.label ?? value;
}

function splitLines(value: string | null): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type HazardComputed = AssessmentDetail["hazards"][number] & {
  score: number;
  band: RiskBand;
};

export function AssessmentView({
  assessment: a,
  canApprove,
  canEdit,
  canRequest,
}: {
  assessment: AssessmentDetail;
  canApprove: boolean;
  canEdit: boolean;
  canRequest: boolean;
}) {
  const hazards = useMemo<HazardComputed[]>(
    () =>
      a.hazards.map((h) => {
        const score = riskScore(h.likelihood, h.severity);
        return { ...h, score, band: riskBand(score) };
      }),
    [a.hazards],
  );

  const hazardCount = hazards.length;
  const overallScore = hazardCount
    ? Math.round(hazards.reduce((n, h) => n + h.score, 0) / hazardCount)
    : 0;
  const headlineBand = hazardCount ? riskBand(overallScore) : null;
  const review = reviewStatusFor(a);

  const distribution = BANDS_DESC.map((band) => ({
    band,
    count: hazards.filter((h) => h.band === band).length,
  }));
  const categories = Array.from(
    new Set(hazards.map((h) => h.riskCategory)),
  ).sort();
  const persons = Array.from(
    new Set(hazards.map((h) => h.personAtRisk).filter(Boolean) as string[]),
  ).sort();

  const [riskFilter, setRiskFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [sort, setSort] = useState<"riskDesc" | "riskAsc" | "order">("riskDesc");

  const visible = useMemo(() => {
    const list = hazards.filter(
      (h) =>
        (!riskFilter || h.band === riskFilter) &&
        (!catFilter || h.riskCategory === catFilter) &&
        (!personFilter || h.personAtRisk === personFilter),
    );
    if (sort === "riskDesc") return [...list].sort((x, y) => y.score - x.score);
    if (sort === "riskAsc") return [...list].sort((x, y) => x.score - y.score);
    return [...list].sort((x, y) => x.sortOrder - y.sortOrder);
  }, [hazards, riskFilter, catFilter, personFilter, sort]);

  const auditItems = a.auditLogs.map((e) => ({
    id: e.id,
    action: e.action,
    detail: e.detail,
    userName: e.userName,
    timestamp: formatDateTime(e.createdAt),
  }));

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ── Control rail ────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[4.5rem]">
          <h2 className="flex h-8 items-center text-base font-semibold text-ink">
            Risk summary
          </h2>
          {/* Overall residual risk */}
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs">
            <p className="eyebrow mb-3">Overall residual risk</p>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl font-mono text-lg font-bold tnum",
                  headlineBand
                    ? BAND_META[headlineBand].cell
                    : "bg-surface-2 text-faint",
                )}
              >
                {hazardCount ? overallScore : "—"}
              </div>
              <div>
                <p
                  className={cn(
                    "text-base font-semibold leading-tight",
                    headlineBand ? BAND_META[headlineBand].text : "text-ink",
                  )}
                >
                  {headlineBand ? BAND_META[headlineBand].label : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {hazardCount} {hazardCount === 1 ? "hazard" : "hazards"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {distribution
                .filter((d) => d.count > 0)
                .map(({ band, count }) => {
                  const meta = BAND_META[band];
                  const pct = hazardCount ? (count / hazardCount) * 100 : 0;
                  return (
                    <div key={band}>
                      <div className="mb-1 flex items-center justify-between text-xs font-medium text-ink-soft">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={cn("size-2 rounded-sm", meta.dot)}
                          />
                          {meta.label}
                        </span>
                        <span className="font-mono tnum text-ink">{count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn("h-full rounded-full", meta.dot)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Approval + next review */}
          <div className="space-y-3.5 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs">
            <div>
              <p className="eyebrow mb-2">Approval</p>
              {a.approvedByName ? (
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-low-bg px-2.5 py-0.5 text-xs font-semibold text-low">
                    <ShieldCheck className="size-3.5" /> Approved
                  </span>
                  <p className="mt-2 text-sm font-medium text-ink">
                    {a.approvedByName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(a.approvedAt)}
                  </p>
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
            <div className="border-t border-line pt-3.5">
              <p className="eyebrow mb-2">Next review</p>
              <ReviewChip review={review} />
              {review.key === "none" ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Scheduled once the assessment is active.
                </p>
              ) : (
                <>
                  <p className="mt-1.5 text-sm font-medium text-ink">
                    {formatDate(a.nextReviewDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {frequencyLabel(a.reviewFrequencyMonths)}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Filter + sort */}
          {hazardCount > 0 && (
            <div className="no-print space-y-3.5 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs">
              <div>
                <p className="eyebrow mb-2">Filter</p>
                <div className="space-y-2">
                  <RailSelect
                    value={riskFilter}
                    onChange={setRiskFilter}
                    allLabel="All risk levels"
                    options={BANDS_DESC.map((b) => ({
                      value: b,
                      label: BAND_META[b].label,
                    }))}
                  />
                  <RailSelect
                    value={catFilter}
                    onChange={setCatFilter}
                    allLabel="All categories"
                    options={categories.map((c) => ({ value: c, label: c }))}
                  />
                  {persons.length > 0 && (
                    <RailSelect
                      value={personFilter}
                      onChange={setPersonFilter}
                      allLabel="Anyone at risk"
                      options={persons.map((p) => ({ value: p, label: p }))}
                    />
                  )}
                </div>
              </div>
              <div className="border-t border-line pt-3.5">
                <p className="eyebrow mb-2">Sort</p>
                <RailSelect
                  value={sort}
                  onChange={(v) => setSort(v as typeof sort)}
                  icon={<SlidersHorizontal className="size-3.5 text-faint" />}
                  options={[
                    { value: "riskDesc", label: "Risk: high → low" },
                    { value: "riskAsc", label: "Risk: low → high" },
                    { value: "order", label: "Assessment order" },
                  ]}
                />
              </div>
            </div>
          )}
        </aside>

        {/* ── Records ─────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex h-8 items-center gap-2.5">
            <h2 className="text-base font-semibold text-ink">
              Hazards &amp; controls
            </h2>
            <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs font-semibold tnum text-muted-foreground">
              {visible.length === hazardCount
                ? hazardCount
                : `${visible.length} / ${hazardCount}`}
            </span>
            <div className="no-print ml-auto flex items-center gap-2">
              <ActivityLogButton items={auditItems} />
              {canEdit && <AddHazardButton assessmentId={a.id} />}
            </div>
          </div>

          {hazardCount === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-10 text-center text-sm text-muted-foreground">
              No hazards recorded.
            </p>
          ) : visible.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-10 text-center text-sm text-muted-foreground">
              No hazards match the current filters.
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((h) => (
                <HazardRecord
                  key={h.id}
                  h={h}
                  n={h.seq}
                  assessmentRef={a.reference}
                  assessmentId={a.id}
                  canRequest={canRequest}
                />
              ))}
            </div>
          )}
        </section>
      </div>

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
                  <span className="text-muted-foreground">
                    {" "}
                    · {outcomeLabel(r.outcome)}
                  </span>
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

    </div>
  );
}

function RailSelect({
  value,
  onChange,
  options,
  allLabel,
  icon,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-lg border border-line-strong bg-surface pr-8 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-line-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
          icon ? "pl-8" : "pl-3",
        )}
      >
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
    </div>
  );
}

function DotScale({
  label,
  value,
  band,
}: {
  label: string;
  value: number;
  band: RiskBand;
}) {
  const meta = BAND_META[band];
  return (
    <div className="flex items-center justify-center gap-1">
      <span
        className={cn(
          "w-8 text-[0.5625rem] font-bold uppercase tracking-wide",
          meta.text,
        )}
      >
        {label}
      </span>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i <= value ? meta.dot : "bg-ink/15",
          )}
        />
      ))}
    </div>
  );
}

function RecordField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function HazardRecord({
  h,
  n,
  assessmentId,
  assessmentRef,
  canRequest,
}: {
  h: HazardComputed;
  n: number;
  assessmentId: string;
  assessmentRef: string;
  canRequest: boolean;
}) {
  const meta = BAND_META[h.band];
  const consequences = splitLines(h.consequence);
  const controls = splitLines(h.currentControls);
  const reference = `${assessmentRef}-HZ-${String(n).padStart(3, "0")}`;

  return (
    <div className="flex overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs print-break-avoid">
      {/* band spine */}
      <div
        className={cn(
          "flex w-24 shrink-0 flex-col items-center justify-center gap-1 px-2 py-4",
          meta.cell,
        )}
      >
        <div className="font-mono text-3xl font-bold leading-none tnum">
          {h.score}
        </div>
        <div className="text-[0.625rem] font-bold uppercase tracking-wider">
          {meta.label}
        </div>
        <div className="mt-3 w-full space-y-1.5">
          <DotScale label="Like." value={h.likelihood} band={h.band} />
          <DotScale label="Sev." value={h.severity} band={h.band} />
        </div>
      </div>

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2.5 border-b border-line bg-surface-2/50 px-4 py-2.5">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold tnum",
              meta.cell,
            )}
          >
            {n}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.625rem] font-medium tracking-wide text-faint">
              {reference}
            </p>
            <h3 className="truncate font-semibold text-ink">{h.hazard}</h3>
          </div>
          <CategoryBadge category={h.riskCategory} />
          {canRequest && (
            <RequestHazardReviewButton
              assessmentId={assessmentId}
              hazardName={h.hazard || `Hazard ${n}`}
              controls={controls}
            />
          )}
        </div>

        <div className="grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2">
          <RecordField label="Risk factor">
            <p className="text-sm leading-relaxed text-ink-soft">
              {h.riskFactor || <span className="text-faint">—</span>}
            </p>
          </RecordField>
          <RecordField label="Person at risk">
            <p className="text-sm leading-relaxed text-ink-soft">
              {h.personAtRisk || <span className="text-faint">—</span>}
            </p>
          </RecordField>
          <RecordField label="Consequence">
            {consequences.length ? (
              <ul className="flex flex-col gap-1.5">
                {consequences.map((c, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-snug text-ink-soft"
                  >
                    <span className="text-line-strong">—</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-faint">—</span>
            )}
          </RecordField>
          <RecordField label="Current controls">
            {controls.length ? (
              <ul className="flex flex-col gap-1.5">
                {controls.map((c, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-snug text-ink-soft"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-low" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-faint">—</span>
            )}
          </RecordField>
        </div>
      </div>
    </div>
  );
}
