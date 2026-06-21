"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form";
import {
  closeIncident,
  deleteIncident,
  reopenIncident,
  setIncidentStatus,
  submitDraft,
} from "@/lib/actions/incidents";
import type { FormState } from "@/lib/form";

export function IncidentActionsBar({
  incident,
  canReport,
  canInvestigate,
  canAdmin,
}: {
  incident: { id: string; status: string };
  canReport: boolean;
  canInvestigate: boolean;
  canAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [closeOpen, setCloseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();

  const run = (fn: () => Promise<FormState>, successMessage: string) => {
    startTransition(async () => {
      const res = await fn();
      if (res && !res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  };

  const onDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteIncident(incident.id);
      // On success the action redirects, so we only get here on failure.
      if (res && !res.ok) {
        toast.error(res.error ?? "Could not delete the incident.");
      }
    });
  };

  const status = incident.status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "Draft" && canReport && (
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => run(() => submitDraft(incident.id), "Report submitted.")}
        >
          Submit report
        </Button>
      )}

      {status === "Open" && canInvestigate && (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(
              () => setIncidentStatus(incident.id, "UnderInvestigation"),
              "Investigation started.",
            )
          }
        >
          Start investigation
        </Button>
      )}

      {(status === "Open" || status === "UnderInvestigation") &&
        canInvestigate && (
          <Button
            variant="secondary"
            onClick={() => setCloseOpen(true)}
          >
            Close incident
          </Button>
        )}

      {status === "Closed" && canInvestigate && (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => reopenIncident(incident.id), "Incident re-opened.")}
        >
          Re-open
        </Button>
      )}

      {canAdmin && (
        <Button
          variant="danger"
          disabled={deletePending}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      )}

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="sm:max-w-md">
          {closeOpen && (
            <CloseIncidentForm
              incidentId={incident.id}
              onDone={() => setCloseOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this incident?"
        description="The incident and all its witnesses, injured parties and follow-up actions will be permanently removed. This can’t be undone."
        confirmLabel="Delete incident"
        pendingLabel="Deleting…"
        variant="danger"
        pending={deletePending}
        onConfirm={onDelete}
      />
    </div>
  );
}

function CloseIncidentForm({
  incidentId,
  onDone,
}: {
  incidentId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    closeIncident,
    null,
  );
  const fe = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) {
      onDone();
      toast.success("Incident closed.");
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Close incident</DialogTitle>
        <DialogDescription>
          Record what concluded the investigation. All follow-up actions must be
          complete before an incident can be closed.
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-3.5">
        <input type="hidden" name="incidentId" value={incidentId} />

        {state && !state.ok && state.error && (
          <p className="rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
            {state.error}
          </p>
        )}

        <Field label="Closing notes" required error={fe.closureNotes}>
          <Textarea name="closureNotes" rows={4} autoFocus required />
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Closing…" : "Close incident"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
