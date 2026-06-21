import { cn } from "@/lib/utils";
import { humaniseHours, triageAgeBucket } from "@/lib/incidents/constants";

// How long a report has waited for triage, RAG-coloured. Phase 1 has no formal
// SLA — this is a visual nudge (fresh → due → overdue), not a deadline.
export function TriageAgeBadge({ since }: { since: Date }) {
  const hours = Math.max(0, (Date.now() - since.getTime()) / 36e5);
  const bucket = triageAgeBucket(hours);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        bucket.pill,
      )}
    >
      <span className={cn("size-1.5 rounded-full", bucket.dot)} />
      {humaniseHours(hours)} waiting
    </span>
  );
}
