"use client";

import { useActionState, useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { requestReview } from "@/lib/actions/review-requests";
import { ResolveRequestButtons } from "@/components/resolve-review-request";
import type { FormState } from "@/lib/form";
import { cn } from "@/lib/utils";

export interface ReviewRequestItem {
  id: string;
  notes: string;
  status: string; // Open | Actioned | Dismissed
  createdAt: string;
  requestedBy: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

const STATUS_PILL: Record<string, string> = {
  Open: "bg-medium-bg text-medium border border-medium-line",
  Actioned: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Dismissed: "bg-slate-100 text-slate-500 border border-slate-200",
};

export function ReviewRequestPanel({
  assessmentId,
  requests,
  canRequest,
  canResolve,
}: {
  assessmentId: string;
  requests: ReviewRequestItem[];
  canRequest: boolean;
  canResolve: boolean;
}) {
  const [openForm, setOpenForm] = useState(false);
  const openCount = requests.filter((r) => r.status === "Open").length;

  return (
    <section className="no-print space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          Review requests
          {openCount > 0 && (
            <span className="rounded-full bg-medium-bg px-1.5 text-xs font-medium text-medium">
              {openCount} open
            </span>
          )}
        </h2>
        {canRequest && (
          <Button
            size="sm"
            variant={openForm ? "secondary" : "primary"}
            onClick={() => setOpenForm((o) => !o)}
          >
            <MessageSquarePlus className="size-4" />
            {openForm ? "Cancel" : "Request review"}
          </Button>
        )}
      </div>

      {openForm && canRequest && (
        <RequestForm
          assessmentId={assessmentId}
          onDone={() => setOpenForm(false)}
        />
      )}

      {requests.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-center text-sm text-muted-foreground">
          No review requests.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="whitespace-pre-line text-sm text-ink-soft">
                  {r.notes}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.requestedBy} · {r.createdAt}
                  {r.resolvedBy && r.resolvedAt
                    ? ` · ${r.status.toLowerCase()} by ${r.resolvedBy}`
                    : ""}
                </p>
                {r.resolutionNote && (
                  <p className="mt-1.5 rounded-md bg-surface-2/60 px-2.5 py-1.5 text-xs text-ink-soft">
                    <span className="font-medium text-ink">Resolution:</span>{" "}
                    {r.resolutionNote}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    STATUS_PILL[r.status] ?? STATUS_PILL.Open,
                  )}
                >
                  {r.status}
                </span>
                {r.status === "Open" && canResolve && (
                  <ResolveRequestButtons id={r.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestForm({
  assessmentId,
  onDone,
}: {
  assessmentId: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    requestReview,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form
      action={action}
      className="space-y-2 rounded-[var(--radius-card)] border border-line bg-surface-2/50 p-3"
    >
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <Textarea
        name="notes"
        rows={2}
        autoFocus
        placeholder="Why does this assessment need reviewing?"
      />
      {(state?.fieldErrors?.notes || state?.error) && (
        <p className="text-xs font-medium text-critical">
          {state?.fieldErrors?.notes ?? state?.error}
        </p>
      )}
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
