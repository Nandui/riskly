import * as React from "react";
import { cn } from "@/lib/utils";
import { STATUS_META, RISK_CATEGORY_META } from "@/lib/constants";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.Draft;
  return (
    <Badge className={meta.pill}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const meta = RISK_CATEGORY_META[category] ?? RISK_CATEGORY_META.Physical;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        meta.pill,
      )}
    >
      {meta.label}
    </span>
  );
}
