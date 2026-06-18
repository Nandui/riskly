"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogReviewForm } from "./log-review-form";
import { cn } from "@/lib/utils";
import type { RiskBand } from "@/lib/risk";

export interface ReviewItem {
  id: string;
  reference: string;
  title: string;
  centerName: string;
  subjectType: string;
  status: string;
  reviewKey: "overdue" | "due";
  reviewLabel: string;
  nextReviewDate: string;
  residualScore: number | null;
  residualBand: RiskBand | null;
}

export function ReviewQueue({
  items,
  todayInput,
  canReview,
}: {
  items: ReviewItem[];
  todayInput: string;
  canReview: boolean;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
      {items.map((it) => (
        <ReviewRow
          key={it.id}
          item={it}
          todayInput={todayInput}
          canReview={canReview}
        />
      ))}
    </ul>
  );
}

function ReviewRow({
  item,
  todayInput,
  canReview,
}: {
  item: ReviewItem;
  todayInput: string;
  canReview: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.residualBand && item.residualScore != null && (
              <RiskBadge
                score={item.residualScore}
                band={item.residualBand}
                size="sm"
              />
            )}
            <span className="font-mono text-xs text-faint">
              {item.reference}
            </span>
          </div>
          <Link
            href={`/assessments/${item.id}`}
            className="mt-0.5 block truncate font-medium text-ink hover:text-brand"
          >
            {item.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {item.centerName} · {item.subjectType} · due {item.nextReviewDate}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <span
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
              item.reviewKey === "overdue"
                ? "border-critical-line bg-critical-bg text-critical"
                : "border-medium-line bg-medium-bg text-medium",
            )}
          >
            {item.reviewLabel}
          </span>
          <StatusBadge status={item.status} />
          {canReview && (
            <Button
              size="sm"
              variant={open ? "secondary" : "primary"}
              onClick={() => setOpen((o) => !o)}
            >
              <CalendarCheck className="size-4" />
              {open ? "Close" : "Log review"}
            </Button>
          )}
        </div>
      </div>
      {open && canReview && (
        <div className="border-t border-line bg-surface-2/40 px-4 py-4">
          <LogReviewForm
            assessmentId={item.id}
            todayInput={todayInput}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </li>
  );
}
