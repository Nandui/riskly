"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MapPin, UserRound, Activity } from "lucide-react";
import { Input, Select } from "@/components/ui/form";
import { ASSESSMENT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const GROUPS = [
  { key: "area", label: "Area", icon: MapPin },
  { key: "role", label: "Role", icon: UserRound },
  { key: "activity", label: "Activity", icon: Activity },
] as const;

export function ReferenceControls({
  basePath,
  current,
}: {
  basePath: string;
  current: { group: string; q: string; status: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(current.q);

  const push = (next: Partial<typeof current>) => {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    params.set("group", merged.group || "area");
    if (merged.q) params.set("q", merged.q);
    if (merged.status) params.set("status", merged.status);
    startTransition(() => router.push(`${basePath}?${params.toString()}`));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
        {GROUPS.map((g) => {
          const active = current.group === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => push({ group: g.key })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-white shadow-xs"
                  : "text-muted hover:text-ink",
              )}
            >
              <g.icon className="size-4" />
              {g.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: search.trim() });
        }}
        className="relative min-w-[12rem] flex-1"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assessments…"
          className="pl-9"
          aria-label="Search reference"
        />
        {pending && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />
        )}
      </form>

      <Select
        value={current.status}
        onChange={(e) => push({ status: e.target.value })}
        aria-label="Filter by status"
      >
        <option value="">Any status</option>
        {ASSESSMENT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
