import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly on every in-app navigation while the page's data loads,
// so clicks feel responsive even when the server render takes a moment.
export default function Loading() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-14 rounded-[var(--radius-card)] border border-line"
          />
        ))}
      </div>
    </div>
  );
}
