"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AssessmentSearchBar({ defaultQuery }: { defaultQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/assessments?q=${encodeURIComponent(v)}` : "/assessments");
  };

  const clear = () => {
    setQ("");
    router.push("/assessments");
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search hazards, risk factors, consequences, controls…"
          aria-label="Search assessments and hazards"
          className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-9 text-sm text-ink placeholder:text-faint shadow-xs transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        />
        {q && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}
