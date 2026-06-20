import { cn } from "@/lib/utils";
import {
  ACTION_STATUS_META,
  INCIDENT_SEVERITY_META,
  INCIDENT_STATUS_META,
  INCIDENT_TYPE_META,
} from "@/lib/incidents/constants";

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
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

export function IncidentTypeBadge({ type }: { type: string }) {
  const meta = INCIDENT_TYPE_META[type] ?? INCIDENT_TYPE_META.Other;
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

export function IncidentStatusBadge({ status }: { status: string }) {
  const meta = INCIDENT_STATUS_META[status] ?? INCIDENT_STATUS_META.Draft;
  return (
    <Pill className={meta.pill}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Pill>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const meta = INCIDENT_SEVERITY_META[severity] ?? INCIDENT_SEVERITY_META.Minor;
  return (
    <Pill className={meta.pill}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Pill>
  );
}

export function ActionStatusBadge({ status }: { status: string }) {
  const meta = ACTION_STATUS_META[status] ?? ACTION_STATUS_META.Open;
  return (
    <Pill className={meta.pill}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Pill>
  );
}
