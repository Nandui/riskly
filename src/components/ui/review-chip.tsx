import { CalendarClock, CalendarCheck, CalendarX, CalendarOff } from "lucide-react";
import type { ReviewStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";

const META = {
  overdue: {
    cls: "bg-critical-bg text-critical border-critical-line",
    icon: CalendarX,
  },
  due: {
    cls: "bg-medium-bg text-medium border-medium-line",
    icon: CalendarClock,
  },
  ok: {
    cls: "bg-surface-2 text-muted-foreground border-line",
    icon: CalendarCheck,
  },
  none: {
    cls: "bg-surface-2 text-faint border-line",
    icon: CalendarOff,
  },
} as const;

export function ReviewChip({
  review,
  className,
}: {
  review: ReviewStatus;
  className?: string;
}) {
  const m = META[review.key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        m.cls,
        className,
      )}
    >
      <m.icon className="size-3.5" />
      {review.label}
    </span>
  );
}
