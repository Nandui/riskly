import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/badge";
import { ReviewChip } from "@/components/ui/review-chip";
import { ReferenceControls } from "@/components/reference/reference-controls";
import { getCenterContext } from "@/lib/center-context";
import { listAssessments, type AssessmentRow } from "@/lib/data/assessments";
import { pluralize } from "@/lib/utils";

export const metadata = { title: "Reference" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface Group {
  key: string;
  label: string;
  items: AssessmentRow[];
}

function groupByCentre(rows: AssessmentRow[], split: boolean): Group[] {
  if (!split) {
    return rows.length ? [{ key: "all", label: "", items: rows }] : [];
  }
  const map = new Map<string, Group>();
  for (const a of rows) {
    const key = a.centerId;
    if (!map.has(key))
      map.set(key, { key, label: a.center.name, items: [] });
    map.get(key)!.items.push(a);
  }
  return [...map.values()].sort((x, y) => x.label.localeCompare(y.label));
}

export default async function ReferencePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const subjectType = (["Area", "Role", "Activity"].includes(get("group"))
    ? get("group")
    : "Area") as string;
  const q = get("q");
  const status = get("status");

  const { selected, selectedId } = await getCenterContext();
  const all = await listAssessments({
    centerId: selectedId,
    search: q || undefined,
    status: status || undefined,
  });
  const rows = all
    .filter((a) => a.subjectType === subjectType)
    .sort(
      (x, y) =>
        y.summary.maxRiskScore - x.summary.maxRiskScore ||
        x.title.localeCompare(y.title),
    );
  const groups = groupByCentre(rows, !selected);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge base"
        title="Reference"
        description="Browse and search assessments for staff. Switch between area, role and activity assessments to find the right one."
      />

      <ReferenceControls
        basePath="/reference"
        current={{ group: subjectType, q, status }}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nothing to show"
          description={
            q || status
              ? "No assessments match your search."
              : `No ${subjectType.toLowerCase()} assessments yet in this scope.`
          }
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            {rows.length} {subjectType.toLowerCase()}{" "}
            {pluralize(rows.length, "assessment")}
          </p>

          {groups.map((g) => (
            <section key={g.key}>
              {g.label && (
                <h2 className="mb-2 text-sm font-semibold text-ink">
                  {g.label}
                </h2>
              )}
              <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/assessments/${a.id}`}
                      className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        {a.summary.headlineBand && (
                          <RiskBadge
                            score={a.summary.maxRiskScore}
                            band={a.summary.headlineBand}
                            size="sm"
                            showLabel={false}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {a.title}
                          </p>
                          <p className="font-mono text-xs text-faint">
                            {a.reference} · {a.summary.hazardCount}{" "}
                            {pluralize(a.summary.hazardCount, "hazard")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <ReviewChip review={a.summary.review} />
                        <StatusBadge status={a.status} />
                        <ChevronRight className="hidden size-4 shrink-0 text-faint sm:block" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
