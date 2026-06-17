import * as React from "react";
import { cn } from "@/lib/utils";
import { STATUS_META, ACTION_STATUS_META } from "@/lib/constants";

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

export function ActionBadge({ status }: { status: string }) {
  const meta = ACTION_STATUS_META[status] ?? ACTION_STATUS_META.NA;
  return <Badge className={meta.pill}>{meta.label}</Badge>;
}
