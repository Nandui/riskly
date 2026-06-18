import Link from "next/link";
import { MapPin, UserRound, Activity, FileSearch } from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { SearchHit } from "@/lib/data/assessments";

const SUBJECT_ICON: Record<string, typeof MapPin> = {
  Area: MapPin,
  Role: UserRound,
  Activity,
};

// Render a ts_headline snippet, bolding the matched terms (marked [[hl]]…[[/hl]]).
function Highlighted({ text }: { text: string }) {
  const parts = text.split(/\[\[hl\]\]|\[\[\/hl\]\]/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded bg-accent px-0.5 font-medium text-primary"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function AssessmentSearchResults({
  query,
  hits,
  showCenter,
}: {
  query: string;
  hits: SearchHit[];
  showCenter: boolean;
}) {
  if (hits.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title={`No matches for “${query}”`}
        description="Nothing in any assessment or hazard matches that. Try different or fewer words."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {hits.length} {hits.length === 1 ? "result" : "results"} for{" "}
        <span className="font-medium text-ink">“{query}”</span>
      </p>
      <ul className="space-y-2">
        {hits.map((h) => {
          const Icon = SUBJECT_ICON[h.subjectType] ?? MapPin;
          return (
            <li key={h.id}>
              <Link
                href={`/assessments/${h.id}`}
                className="block rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs transition-colors hover:border-line-strong hover:bg-surface-2/40"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-faint">
                    {h.reference}
                  </span>
                  <Icon className="size-4 shrink-0 text-faint" />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">
                    {h.title}
                  </span>
                  {h.summary.headlineBand && (
                    <RiskBadge
                      score={h.summary.overallScore}
                      band={h.summary.headlineBand}
                      size="sm"
                    />
                  )}
                  <StatusBadge status={h.status} />
                </div>
                {h.headline && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    <Highlighted text={h.headline} />
                  </p>
                )}
                {showCenter && (
                  <p className="mt-1 text-xs text-faint">{h.center.name}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
