import Link from "next/link";
import { ChevronRight, Building2, MapPin, UserRound, Activity } from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/badge";
import { ReviewChip } from "@/components/ui/review-chip";
import type { AssessmentRow } from "@/lib/data/assessments";
import { cn } from "@/lib/utils";

function Tag({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Icon className="size-3.5 text-faint" />
      {children}
    </span>
  );
}

export function AssessmentTable({
  rows,
  showCenter = false,
}: {
  rows: AssessmentRow[];
  showCenter?: boolean;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
      {rows.map((a) => {
        const s = a.summary;
        return (
          <li key={a.id}>
            <Link
              href={`/assessments/${a.id}`}
              className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-faint">
                    {a.reference}
                  </span>
                  {s.headlineBand && (
                    <RiskBadge
                      score={s.maxResidualScore}
                      band={s.headlineBand}
                      size="sm"
                    />
                  )}
                </div>
                <p className="mt-0.5 truncate font-medium text-ink">{a.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {showCenter && (
                    <Tag icon={Building2}>{a.center.name}</Tag>
                  )}
                  <Tag icon={MapPin}>{a.area.name}</Tag>
                  {a.role && <Tag icon={UserRound}>{a.role.name}</Tag>}
                  {a.activity && <Tag icon={Activity}>{a.activity.name}</Tag>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {s.openActions > 0 && (
                  <span
                    className={cn(
                      "whitespace-nowrap text-xs font-medium",
                      s.overdueActions > 0 ? "text-critical" : "text-muted",
                    )}
                  >
                    {s.openActions} open
                    {s.overdueActions > 0 ? ` · ${s.overdueActions} overdue` : ""}
                  </span>
                )}
                <ReviewChip review={s.review} />
                <StatusBadge status={a.status} />
                <ChevronRight className="hidden size-4 shrink-0 text-faint sm:block" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
