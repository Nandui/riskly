import Link from "next/link";
import {
  BookOpen,
  MapPin,
  UserRound,
  Activity,
  ChevronRight,
} from "lucide-react";
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

type GroupBy = "area" | "role" | "activity";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface Group {
  key: string;
  label: string;
  sublabel?: string;
  items: AssessmentRow[];
}

function groupAssessments(
  rows: AssessmentRow[],
  groupBy: GroupBy,
  showCenter: boolean,
): Group[] {
  const map = new Map<string, Group>();

  for (const a of rows) {
    let key: string;
    let label: string;
    let sublabel: string | undefined;

    if (groupBy === "area") {
      key = a.areaId;
      label = a.area.name;
      sublabel = showCenter ? a.center.name : undefined;
    } else if (groupBy === "role") {
      key = a.roleId ?? "_none";
      label = a.role?.name ?? "Unassigned role";
    } else {
      key = a.activityId ?? "_none";
      label = a.activity?.name ?? "Unassigned activity";
    }

    if (!map.has(key)) map.set(key, { key, label, sublabel, items: [] });
    map.get(key)!.items.push(a);
  }

  const groups = [...map.values()];
  for (const g of groups) {
    g.items.sort(
      (x, y) =>
        y.summary.maxResidualScore - x.summary.maxResidualScore ||
        x.title.localeCompare(y.title),
    );
  }
  groups.sort((a, b) => a.label.localeCompare(b.label));
  return groups;
}

const GROUP_ICON = { area: MapPin, role: UserRound, activity: Activity };

export default async function ReferencePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const groupBy = (["area", "role", "activity"].includes(get("group"))
    ? get("group")
    : "area") as GroupBy;
  const q = get("q");
  const status = get("status");

  const { selected, selectedId } = await getCenterContext();
  const rows = await listAssessments({
    centerId: selectedId,
    search: q || undefined,
    status: status || undefined,
  });
  const groups = groupAssessments(rows, groupBy, !selected);
  const GroupIcon = GROUP_ICON[groupBy];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge base"
        title="Reference"
        description="Browse and search assessments as a reference for staff. Switch how they're grouped to find the right one fast."
      />

      <ReferenceControls
        basePath="/reference"
        current={{ group: groupBy, q, status }}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nothing to show"
          description={
            q || status
              ? "No assessments match your search."
              : "Once you add assessments they'll appear here, grouped for easy reference."
          }
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            {rows.length} {pluralize(rows.length, "assessment")} ·{" "}
            {groups.length} {pluralize(groups.length, "group")}
          </p>

          {groups.map((g) => (
            <section key={g.key}>
              <div className="mb-2 flex items-baseline gap-2">
                <GroupIcon className="size-4 shrink-0 translate-y-0.5 text-brand" />
                <h2 className="font-semibold text-ink">{g.label}</h2>
                {g.sublabel && (
                  <span className="text-xs text-muted">{g.sublabel}</span>
                )}
                <span className="text-xs tnum text-faint">
                  {g.items.length}
                </span>
              </div>

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
                            score={a.summary.maxResidualScore}
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
                            {a.reference}
                            {groupBy !== "role" && a.role
                              ? ` · ${a.role.name}`
                              : ""}
                            {groupBy !== "activity" && a.activity
                              ? ` · ${a.activity.name}`
                              : ""}
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
