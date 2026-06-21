import {
  assessmentTitle,
  type AssessmentDetail,
} from "@/lib/data/assessments";
import { riskScore, riskBand, BAND_META, type RiskBand } from "@/lib/risk";
import { parsePersons } from "@/lib/persons";
import {
  REVIEW_FREQUENCY_OPTIONS,
  STATUS_META,
  RISK_CATEGORY_META,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const BANDS_DESC: RiskBand[] = ["veryHigh", "high", "medium", "low"];

function splitLines(s: string | null | undefined): string[] {
  return (s ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// A formal, paper-friendly risk assessment report. Rendered hidden on screen
// and shown only when printing (see `.print-report` in globals.css).
export function AssessmentReport({
  assessment: a,
}: {
  assessment: AssessmentDetail;
}) {
  const title = assessmentTitle(a);
  const hazards = a.hazards.map((h) => {
    const score = riskScore(h.likelihood, h.severity);
    return { ...h, score, band: riskBand(score) };
  });
  const count = hazards.length;
  const overall = count
    ? Math.round(hazards.reduce((n, h) => n + h.score, 0) / count)
    : 0;
  const overallBand: RiskBand | null = count ? riskBand(overall) : null;
  const distribution = BANDS_DESC.map((band) => ({
    band,
    count: hazards.filter((h) => h.band === band).length,
  })).filter((d) => d.count > 0);

  const reviewFreq =
    REVIEW_FREQUENCY_OPTIONS.find((o) => o.value === a.reviewFrequencyMonths)
      ?.label ?? `Every ${a.reviewFrequencyMonths} months`;

  return (
    <div className="print-report text-ink">
      {/* Document header */}
      <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-2.5">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="size-9" />
          <div className="leading-tight">
            <p className="text-base font-bold">{a.center.name}</p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Risk Assessment
            </p>
          </div>
        </div>
        <div className="text-right leading-tight">
          <p className="font-mono text-sm font-bold">{a.reference}</p>
          <p className="text-[0.7rem] text-muted-foreground">
            {STATUS_META[a.status]?.label ?? a.status} · v{a.version}
          </p>
        </div>
      </header>

      <h1 className="mt-2.5 text-lg font-bold leading-tight">{title}</h1>
      <p className="text-xs text-muted-foreground">
        {a.subjectType} assessment · {a.center.name}
      </p>

      {/* Details */}
      <table className="report-meta mt-3 w-full border-collapse">
        <tbody>
          <Row
            cells={[
              ["Owner", a.owner?.name ?? a.owner?.email ?? "—"],
              ["Department", a.department?.name ?? "—"],
            ]}
          />
          <Row
            cells={[
              ["Assessed by", a.assessorName || "—"],
              ["Assessment date", formatDate(a.assessmentDate)],
            ]}
          />
          <Row
            cells={[
              ["Review frequency", reviewFreq],
              [
                "Next review due",
                a.status === "Approved" ? formatDate(a.nextReviewDate) : "Not scheduled",
              ],
            ]}
          />
        </tbody>
      </table>

      {a.description && (
        <div className="mt-3">
          <Heading>Scope</Heading>
          <p className="text-xs leading-snug text-ink">{a.description}</p>
        </div>
      )}

      {/* Approvals */}
      <div className="mt-3">
        <Heading>Approvals &amp; sign-off</Heading>
        <div className="grid grid-cols-2 gap-3">
          <SignOff
            label="Owner sign-off"
            name={a.ownerApprovedByName}
            date={a.ownerApprovedAt}
          />
          <SignOff
            label="CEO sign-off"
            name={a.ceoApprovedByName}
            date={a.ceoApprovedAt}
          />
        </div>
      </div>

      {/* Risk summary */}
      <div className="mt-3">
        <Heading>Risk summary</Heading>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <span>
            Overall residual risk:{" "}
            <strong className="text-sm">
              {count ? overall : "—"}
              {overallBand ? ` · ${BAND_META[overallBand].label}` : ""}
            </strong>
          </span>
          <span>
            <strong>{count}</strong> hazard{count === 1 ? "" : "s"}
          </span>
          {distribution.map((d) => (
            <span key={d.band}>
              {BAND_META[d.band].label}: <strong>{d.count}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Hazards */}
      <div className="mt-3">
        <Heading>Hazards &amp; controls ({count})</Heading>
        {count === 0 ? (
          <p className="text-xs text-muted-foreground">No hazards recorded.</p>
        ) : (
          <div className="space-y-2">
            {hazards.map((h, i) => {
              const meta = BAND_META[h.band];
              const reference = `${a.reference}-HZ-${String(h.seq).padStart(3, "0")}`;
              const persons = parsePersons(h.personAtRisk);
              const consequences = splitLines(h.consequence);
              const controls = splitLines(h.currentControls);
              return (
                <div
                  key={h.id}
                  className="report-hazard overflow-hidden rounded border border-ink/30"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-ink/20 bg-surface-2 px-2 py-1">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="font-mono text-[0.65rem] text-muted-foreground">
                        {i + 1}. {reference}
                      </span>
                      <span className="truncate text-xs font-bold">
                        {h.hazard}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-bold",
                        meta.cell,
                      )}
                    >
                      L{h.likelihood}×S{h.severity} = {h.score} · {meta.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2">
                    <Field label="Risk factor" className="border-r border-ink/15">
                      {h.riskFactor || <Dash />}
                    </Field>
                    <Field label="Persons at risk">
                      {persons.length ? persons.join(", ") : <Dash />}
                    </Field>
                    <Field
                      label="Consequence"
                      className="border-r border-t border-ink/15"
                    >
                      {consequences.length ? (
                        <List items={consequences} />
                      ) : (
                        <Dash />
                      )}
                    </Field>
                    <Field
                      label="Current controls"
                      className="border-t border-ink/15"
                    >
                      {controls.length ? <List items={controls} /> : <Dash />}
                    </Field>
                  </div>
                  <div className="border-t border-ink/15 px-2 py-1 text-[0.65rem] text-muted-foreground">
                    Category: {RISK_CATEGORY_META[h.riskCategory]?.label ?? h.riskCategory}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-5 border-t border-ink/20 pt-1.5 text-[0.6rem] text-muted-foreground">
        {a.reference} · {title} · Generated {formatDate(new Date())} · This is a
        controlled document — verify it is the current version before relying on
        it.
      </footer>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 border-b border-ink/30 pb-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-ink">
      {children}
    </h2>
  );
}

function Row({ cells }: { cells: [string, string][] }) {
  return (
    <tr>
      {cells.map(([label, value], i) => (
        <td
          key={i}
          className="w-1/2 border border-ink/15 px-2 py-1 align-top text-xs"
        >
          <span className="font-semibold text-muted-foreground">{label}: </span>
          <span className="text-ink">{value}</span>
        </td>
      ))}
    </tr>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("px-2 py-1.5", className)}>
      <p className="text-[0.58rem] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-[0.7rem] leading-snug text-ink">{children}</div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-3.5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

function SignOff({
  label,
  name,
  date,
}: {
  label: string;
  name: string | null;
  date: Date | null;
}) {
  return (
    <div className="border border-ink/30 px-2.5 py-2">
      <p className="text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {name ? (
        <div className="mt-2">
          <p className="text-sm font-semibold leading-tight">{name}</p>
          <p className="text-[0.7rem] text-muted-foreground">
            {date ? formatDate(date) : ""}
          </p>
        </div>
      ) : (
        <p className="mt-6 border-t border-ink/40 pt-1 text-[0.7rem] text-muted-foreground">
          Awaiting sign-off
        </p>
      )}
    </div>
  );
}
