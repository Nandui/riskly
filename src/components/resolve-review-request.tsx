"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { resolveReviewRequest } from "@/lib/actions/review-requests";

type Action = "Actioned" | "Dismissed";

// The Action / Dismiss controls for an open review request. Resolving opens a
// dialog for a resolution note (required when dismissing) and confirms the
// outcome with a toast — rather than firing on a single click.
export function ResolveRequestButtons({ id }: { id: string }) {
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const close = () => {
    if (pending) return;
    setAction(null);
    setNote("");
  };

  const dismissing = action === "Dismissed";
  const requireNote = dismissing;
  const canConfirm = !pending && (!requireNote || note.trim().length > 0);

  const confirm = () => {
    if (!action || !canConfirm) return;
    const current = action;
    start(async () => {
      const res = await resolveReviewRequest(id, current, note.trim());
      if (res && !res.ok) {
        toast.error(res.error ?? "Couldn't resolve the request.");
        return;
      }
      toast.success(
        current === "Actioned"
          ? "Request marked as actioned."
          : "Request dismissed.",
      );
      setAction(null);
      setNote("");
    });
  };

  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => setAction("Actioned")}
        className="rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
      >
        Action
      </button>
      <button
        type="button"
        onClick={() => setAction("Dismissed")}
        className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-ink"
      >
        Dismiss
      </button>

      <Dialog open={action !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dismissing ? "Dismiss review request" : "Mark request as actioned"}
            </DialogTitle>
            <DialogDescription>
              {dismissing
                ? "Explain why this request is being dismissed. The note is recorded on the request and in the activity log."
                : "Optionally note what was done to address it. The note is recorded on the request and in the activity log."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            autoFocus
            placeholder={
              dismissing ? "Why is this being dismissed?" : "What was done? (optional)"
            }
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={dismissing ? "danger" : "primary"}
              onClick={confirm}
              disabled={!canConfirm}
            >
              {pending
                ? "Saving…"
                : dismissing
                  ? "Dismiss request"
                  : "Mark actioned"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
}
