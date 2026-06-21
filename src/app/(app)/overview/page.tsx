import Link from "next/link";
import {
  ClipboardList,
  Layers,
  ShieldAlert,
  TriangleAlert,
  LayoutDashboard,
  Plus,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AssessmentsTableView } from "@/components/assessments/assessments-table-view";
import { HighRiskTable } from "@/components/monitoring/high-risk-table";
import { RiskMatrixHeat } from "@/components/risk-matrix";
import { RiskBandChart, CategoryChart } from "@/components/dashboard/dashboard-charts";
import { getCenterContext } from "@/lib/center-context";
import { getDashboard, getHighRiskHazards } from "@/lib/data/monitoring";
import { assessmentTitle } from "@/lib/data/assessments";
import { getCurrentUser, can } from "@/lib/auth";
import { RISK_BANDS, BAND_META } from "@/lib/risk";
import { cn, pluralize } from "@/lib/utils";

export const metadata = { title: "Risk overview" };

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  sub?: string;
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
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="size-4 text-faint" />
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tnum", toneCls)}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub ?? " "}</p>
    </div>
  );
}

export default async function RiskOverviewPage() {
  const { selected, selectedId } = await getCenterContext();
  const user = await getCurrentUser();
  const [d, highRisk] = await Promise.all([
    getDashboard(selectedId),
    getHighRiskHazards(selectedId),
  ]);
  const canEdit = can(user, "editContent");

  const highRiskRows = highRisk.slice(0, 8).map((h) => ({
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="Risk overview"
        description="Risk ratios and highlights across your assessments — where risk sits, and what stands out."
        actions={
          canEdit ? (
            <Link href="/assessments/new" className={buttonClasses()}>
              <Plus className="size-4" /> New assessment
            </Link>
          ) : undefined
        }
      />

      {d.total === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Nothing to report yet"
          description="Add a centre and create your first risk assessment to see your risk overview come to life."
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
            />
            <Kpi
              icon={Layers}
              label="Hazards"
              value={d.hazardCount}
              sub="Across active assessments"
            />
            <Kpi
              icon={TriangleAlert}
              label="High-risk hazards"
              value={d.highRiskHazards}
              tone={d.highRiskHazards > 0 ? "critical" : "default"}
              sub={d.highRiskHazards > 0 ? "High / very high" : "None in scope"}
            />
            <Kpi
              icon={ShieldAlert}
              label="Very high"
              value={d.bandCounts.veryHigh}
              tone={d.bandCounts.veryHigh > 0 ? "critical" : "default"}
              sub="Assessments rated very high"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Risk band distribution</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {d.activeCount} {pluralize(d.activeCount, "assessment")}
                </span>
              </CardHeader>
              <div className="p-4">
                <RiskBandChart
                  data={RISK_BANDS.map((b) => ({
                    band: b,
                    label: BAND_META[b].label,
                    count: d.bandCounts[b],
                  }))}
                />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hazards by category</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {d.hazardCount} {pluralize(d.hazardCount, "hazard")}
                </span>
              </CardHeader>
              <div className="p-4">
                <CategoryChart data={d.categoryCounts} />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall risk map</CardTitle>
                <span className="text-xs text-muted-foreground">
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
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <TriangleAlert className="size-4 text-muted-foreground" /> Top high &amp;
                very high risk
                <span className="font-normal tnum text-muted-foreground">
                  {highRisk.length}
                </span>
              </h2>
              <Link
                href="/monitoring"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Monitoring <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {highRiskRows.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No hazards are rated High or Very High in this scope.
              </div>
            ) : (
              <HighRiskTable rows={highRiskRows} showCenter={!selected} />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Recent assessments</h2>
              <Link
                href="/assessments"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                All assessments <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <AssessmentsTableView rows={d.recent} showCenter={!selected} compact />
          </section>
        </>
      )}
    </div>
  );
}
