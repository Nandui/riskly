"use client";

import Link from "next/link";
import { ResolveRequestButtons } from "@/components/resolve-review-request";

export interface OpenRequestItem {
  id: string;
  notes: string;
  requestedBy: string;
  createdAt: string;
  assessmentId: string;
  reference: string;
  title: string;
  centerName: string;
}

export function OpenRequests({
  items,
  canResolve,
}: {
  items: OpenRequestItem[];
  canResolve: boolean;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
      {items.map((r) => (
        <RequestRow key={r.id} r={r} canResolve={canResolve} />
      ))}
    </ul>
  );
}

function RequestRow({
  r,
  canResolve,
}: {
  r: OpenRequestItem;
  canResolve: boolean;
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <Link
          href={`/assessments/${r.assessmentId}`}
          className="block truncate font-medium text-ink hover:text-brand"
        >
          {r.title}
        </Link>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono text-faint">{r.reference}</span> ·{" "}
          {r.centerName} · {r.requestedBy} · {r.createdAt}
        </p>
        <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">
          {r.notes}
        </p>
      </div>
      {canResolve && <ResolveRequestButtons id={r.id} />}
    </li>
  );
}
