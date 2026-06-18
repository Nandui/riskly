"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Select, Input } from "@/components/ui/form";
import { ASSESSMENT_STATUSES } from "@/lib/constants";
import { RISK_BANDS, BAND_META } from "@/lib/risk";

interface Option {
  id: string;
  name: string;
}

export interface FilterValues {
  q: string;
  areaId: string;
  roleId: string;
  activityId: string;
  status: string;
  band: string;
}

export function AssessmentFilters({
  basePath,
  current,
  areas,
  roles,
  activities,
  showArea,
}: {
  basePath: string;
  current: FilterValues;
  areas: Option[];
  roles: Option[];
  activities: Option[];
  showArea: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(current.q);

  const push = (next: Partial<FilterValues>) => {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath));
  };

  const hasFilters =
    !!(current.q || current.areaId || current.roleId || current.activityId || current.status || current.band);

  const selectClass = "min-w-0";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            push({ q: search.trim() });
          }}
          className="relative min-w-[14rem] flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, reference or hazard…"
            className="pl-9"
            aria-label="Search assessments"
          />
          {pending && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </form>

        {showArea && (
          <Select
            value={current.areaId}
            onChange={(e) => push({ areaId: e.target.value })}
            className={selectClass}
            aria-label="Filter by area"
          >
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        )}

        <Select
          value={current.roleId}
          onChange={(e) => push({ roleId: e.target.value })}
          className={selectClass}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>

        <Select
          value={current.activityId}
          onChange={(e) => push({ activityId: e.target.value })}
          className={selectClass}
          aria-label="Filter by activity"
        >
          <option value="">All activities</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>

        <Select
          value={current.status}
          onChange={(e) => push({ status: e.target.value })}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          {ASSESSMENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <Select
          value={current.band}
          onChange={(e) => push({ band: e.target.value })}
          className={selectClass}
          aria-label="Filter by residual risk"
        >
          <option value="">Any risk</option>
          {RISK_BANDS.map((b) => (
            <option key={b} value={b}>
              {BAND_META[b].label} risk
            </option>
          ))}
        </Select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              startTransition(() => router.push(basePath));
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-ink"
          >
            <X className="size-4" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
