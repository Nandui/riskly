"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UsersRound,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Pencil,
  History,
  FilePlus2,
  Upload,
  Undo2,
  CircleCheck,
  MessageSquarePlus,
  CheckCheck,
  Dot,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { StatusBadge, CategoryBadge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/ui/risk-badge";
import { ReviewChip } from "@/components/ui/review-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonClasses } from "@/components/ui/button";
import {
  getAssessmentDrawerData,
  type AssessmentDrawerData,
} from "@/lib/actions/assessment-detail";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; Icon: LucideIcon }> = {
  created: { label: "Created", Icon: FilePlus2 },
  updated: { label: "Edited", Icon: Pencil },
  imported: { label: "Imported", Icon: Upload },
  approved: { label: "Approved", Icon: ShieldCheck },
  approval_revoked: { label: "Approval withdrawn", Icon: Undo2 },
  review_logged: { label: "Review logged", Icon: CircleCheck },
  review_requested: { label: "Review requested", Icon: MessageSquarePlus },
  review_request_resolved: { label: "Review request resolved", Icon: CheckCheck },
};

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <div className="text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

export function AssessmentDrawer({
  id,
  onOpenChange,
}: {
  id: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<AssessmentDrawerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setData(null);
    getAssessmentDrawerData(id).then((d) => {
      if (active) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-lg">
        {loading || !data ? (
          <DrawerSkeleton />
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2.5 pr-8">
                <span className="font-mono text-xs text-faint">
                  {data.reference}
                </span>
                <StatusBadge status={data.status} />
              </div>
              <SheetTitle>{data.title}</SheetTitle>
              <SheetDescription>
                {data.centerName} · {data.subjectType} assessment
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-4">
                <Fact label="Owner">
                  {data.assignees.length ? (
                    <span className="inline-flex items-center gap-1.5">
                      <UsersRound className="size-3.5 text-faint" />
                      {data.assignees
                        .map((u) => u.name ?? u.email)
                        .join(", ")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </Fact>
                <Fact label="Overall risk">
                  {data.headlineBand ? (
                    <RiskBadge
                      score={data.overallScore}
                      band={data.headlineBand}
                      size="sm"
                    />
                  ) : (
                    <span className="text-faint">No hazards rated</span>
                  )}
                </Fact>
                <Fact label="Next review">
                  <ReviewChip review={data.review} />
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {data.nextReviewDate} · {data.reviewFrequencyLabel}
                  </span>
                </Fact>
                <Fact label="Assessed by">
                  {data.assessorName || "—"}
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {data.assessmentDate}
                  </span>
                </Fact>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-3">
                <p className="eyebrow mb-1.5">Approval</p>
                {data.approvedByName ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {data.approvedByName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.approvedAt}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-strong">
                      <ShieldCheck className="size-3.5" /> Approved
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not yet approved
                  </p>
                )}
              </div>

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                  Hazards
                  <span className="font-normal tnum text-muted-foreground">
                    {data.hazardCount}
                  </span>
                  {data.highRiskCount > 0 && (
                    <span className="text-xs font-medium text-critical">
                      · {data.highRiskCount} high
                    </span>
                  )}
                </h3>
                {data.hazards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hazards recorded.
                  </p>
                ) : (
                  <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                    {data.hazards.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {h.hazard}
                        </span>
                        <CategoryBadge category={h.category} />
                        <RiskBadge score={h.score} band={h.band} size="sm" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {data.audit.length > 0 && (
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    <History className="size-4 text-muted-foreground" /> Activity
                  </h3>
                  <ul className="space-y-3">
                    {data.audit.map((e) => {
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
                                <span className="text-muted-foreground">
                                  {" "}
                                  — {e.detail}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.userName ?? "System"} · {e.createdAt}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>

            <SheetFooter className="flex-row justify-end">
              {data.canEdit && (
                <Link
                  href={`/assessments/${data.id}/edit`}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  <Pencil className="size-3.5" /> Edit
                </Link>
              )}
              <Link
                href={`/assessments/${data.id}`}
                className={buttonClasses({ size: "sm" })}
              >
                <ExternalLink className="size-3.5" /> Open full page
              </Link>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerSkeleton() {
  return (
    <>
      <SheetHeader>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-40" />
      </SheetHeader>
      <div className="flex-1 space-y-5 p-5">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-9 w-full")} />
          ))}
        </div>
      </div>
    </>
  );
}
