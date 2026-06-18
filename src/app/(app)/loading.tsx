// Shown instantly on every in-app navigation while the page's data loads,
// so clicks feel responsive even when the server render takes a moment.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="space-y-2.5">
        <div className="h-3 w-24 rounded bg-surface-2" />
        <div className="h-7 w-52 rounded bg-surface-2" />
        <div className="h-3 w-80 max-w-full rounded bg-surface-2" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-xs"
          >
            <div className="h-3 w-20 rounded bg-surface-2" />
            <div className="mt-3 h-7 w-12 rounded bg-surface-2" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-[var(--radius-card)] border border-line bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
