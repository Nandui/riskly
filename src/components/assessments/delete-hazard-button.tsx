"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
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
import { deleteHazard } from "@/lib/actions/assessments";

export function DeleteHazardButton({
  hazardId,
  hazardName,
  inForce,
}: {
  hazardId: string;
  hazardName: string;
  inForce: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const res = await deleteHazard(hazardId);
      if (res && !res.ok) {
        toast.error(res.error ?? "Couldn't delete the hazard.");
        return;
      }
      toast.success("Hazard deleted.");
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Delete hazard"
        title="Delete hazard"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-critical-bg hover:text-critical"
      >
        <Trash2 className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete hazard?</DialogTitle>
            <DialogDescription>
              {hazardName && (
                <>
                  <span className="font-medium text-ink">“{hazardName}”</span>{" "}
                  will be removed.{" "}
                </>
              )}
              {inForce
                ? "This sends the assessment back to Under review and clears its approval. It can’t be undone."
                : "This can’t be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onConfirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete hazard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
