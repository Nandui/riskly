import Link from "next/link";
import {
  ClipboardList,
  CalendarX,
  CalendarClock,
  TriangleAlert,
  ArrowRight,
  LayoutDashboard,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AssessmentTable } from "@/components/assessments/assessment-table";
import { RiskMatrixHeat } from "@/components/risk-matrix";
import { getCenterContext } from "@/lib/center-context";
import { getDashboard } from "@/lib/data/monitoring";
import { RISK_BANDS, BAND_META, type RiskBand } from "@/lib/risk";
import { cn, pluralize } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
  href,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  sub?: string;
  tone?: "default" | "critical" | "medium";
  href: string;
}) {
  const toneCls =
    tone === "critical"
      ? "text-critical"
      : tone === "medium"
        ? "text-medium"
        : "text-ink";
  return (
    <Link
      href={href}
      className="group rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs transition-colors hover:border-line-strong"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{label}</p>
        <Icon className="size-4 text-faint" />
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tnum", toneCls)}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub ?? " "}</p>
    </Link>
  );
}

function BandBar({ counts }: { counts: Record<RiskBand, number> }) {
  const total = RISK_BANDS.reduce((n, b) => n + counts[b], 0);
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
        {total > 0 &&
          RISK_BANDS.map((b) =>
            counts[b] > 0 ? (
              <div
                key={b}
                className={BAND_META[b].dot}
                style={{ width: `${(counts[b] / total) * 100}%` }}
              />
            ) : null,
          )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
        {RISK_BANDS.map((b) => (
          <div key={b} className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", BAND_META[b].dot)} />
            <span className="text-sm text-ink-soft">{BAND_META[b].label}</span>
            <span className="ml-auto text-sm font-semibold tnum text-ink">
              {counts[b]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { selected, selectedId } = await getCenterContext();
  const d = await getDashboard(selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Dashboard"
        description="Risk at a glance across your assessments — what's overdue, what needs action, and where risk sits."
        actions={
          <Link href="/assessments/new" className={buttonClasses()}>
            <Plus className="size-4" /> New assessment
          </Link>
        }
      />

      {d.total === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Nothing to report yet"
          description="Add a centre and create your first risk assessment to see your dashboard come to life."
          action={
            <div className="flex gap-2">
              <Link href="/centers/new" className={buttonClasses({ variant: "secondary" })}>
                Add a centre
              </Link>
              <Link href="/assessments/new" className={buttonClasses()}>
                New assessment
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={ClipboardList}
              label="Assessments"
              value={d.total}
              sub={`${d.activeCount} active`}
              href="/assessments"
            />
            <Kpi
              icon={CalendarX}
              label="Overdue reviews"
              value={d.reviewsOverdue}
              tone={d.reviewsOverdue > 0 ? "critical" : "default"}
              sub={d.reviewsOverdue > 0 ? "Needs attention" : "All current"}
              href="/monitoring"
            />
            <Kpi
              icon={CalendarClock}
              label="Reviews due soon"
              value={d.reviewsDue}
              tone={d.reviewsDue > 0 ? "medium" : "default"}
              sub="Within 30 days"
              href="/monitoring"
            />
            <Kpi
              icon={TriangleAlert}
              label="High-risk hazards"
              value={d.highRiskHazards}
              tone={d.highRiskHazards > 0 ? "critical" : "default"}
              sub={d.highRiskHazards > 0 ? "High / very high" : "None in scope"}
              href="/monitoring"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Overall risk profile</CardTitle>
                <span className="text-xs text-muted">
                  {d.activeCount} {pluralize(d.activeCount, "assessment")}
                </span>
              </CardHeader>
              <div className="p-5">
                <BandBar counts={d.bandCounts} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall risk map</CardTitle>
                <span className="text-xs text-muted">
                  {d.hazardCount} {pluralize(d.hazardCount, "hazard")}
                </span>
              </CardHeader>
              <div className="flex justify-center p-5">
                <div className="w-full max-w-[15rem]">
                  <RiskMatrixHeat counts={d.matrix} />
                </div>
              </div>
            </Card>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Needs attention</h2>
              <Link
                href="/monitoring"
                className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
              >
                Monitoring <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {d.attention.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted">
                No reviews are overdue or due soon. Nicely on top of it.
              </div>
            ) : (
              <AssessmentTable rows={d.attention} showCenter={!selected} />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                Recent assessments
              </h2>
              <Link
                href="/assessments"
                className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
              >
                All assessments <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <AssessmentTable rows={d.recent} showCenter={!selected} />
          </section>
        </>
      )}
    </div>
  );
}
