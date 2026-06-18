"use client";

import { useTransition } from "react";
import { Building2, ChevronsUpDown, Loader2 } from "lucide-react";
import { selectCenter } from "@/lib/actions/center";
import { ALL_CENTERS, type CenterSummary } from "@/lib/center-shared";
import { cn } from "@/lib/utils";

export function CenterSwitcher({
  centers,
  selectedId,
}: {
  centers: CenterSummary[];
  selectedId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Building2 className="size-4" />
      </span>
      <select
        aria-label="Active centre"
        value={selectedId ?? ALL_CENTERS}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => {
            void selectCenter(e.target.value);
          })
        }
        className={cn(
          "h-10 w-full cursor-pointer appearance-none rounded-lg border border-sidebar-line bg-sidebar-2 pl-9 pr-9 text-sm font-medium text-sidebar-ink",
          "transition-colors hover:border-line-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none",
          pending && "opacity-70",
        )}
      >
        <option value={ALL_CENTERS}>All centres</option>
        {centers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-muted">
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ChevronsUpDown className="size-4" />
        )}
      </span>
    </div>
  );
}
