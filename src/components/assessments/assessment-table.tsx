import Link from "next/link";
import { ChevronRight, Building2, MapPin, UserRound, Activity } from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/badge";
import { ReviewChip } from "@/components/ui/review-chip";
import type { AssessmentRow } from "@/lib/data/assessments";

const SUBJECT_ICON: Record<string, typeof MapPin> = {
  Area: MapPin,
  Role: UserRound,
  Activity,
};

function Tag({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
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
                      score={s.overallScore}
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
                  <Tag icon={SUBJECT_ICON[a.subjectType] ?? MapPin}>
                    {a.subjectType}
                  </Tag>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {s.highRiskCount > 0 && (
                  <span className="whitespace-nowrap text-xs font-medium text-critical">
                    {s.highRiskCount} high risk
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
