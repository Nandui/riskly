"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ClipboardCheck } from "lucide-react";
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
import { Field, Select, Textarea } from "@/components/ui/form";
import {
  closeIncident,
  deleteIncident,
  reopenIncident,
  setIncidentStatus,
  submitDraft,
} from "@/lib/actions/incidents";
import type { FormState } from "@/lib/form";
import type { LinkableAssessment } from "@/lib/data/assessments";

export type CloseContext = {
  assessments: LinkableAssessment[];
  canLinkExisting: boolean;
  canSpawnDraft: boolean;
  hasArea: boolean;
};

export function IncidentActionsBar({
  incident,
  canReport,
  canTriage,
  canInvestigate,
  canAdmin,
  closeContext,
}: {
  incident: { id: string; status: string };
  canReport: boolean;
  canTriage: boolean;
  canInvestigate: boolean;
  canAdmin: boolean;
  closeContext: CloseContext;
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

      {status === "AwaitingTriage" && canTriage && (
        <Button
          variant="primary"
          onClick={() => router.push(`/incidents/${incident.id}/triage`)}
        >
          <ClipboardCheck className="size-4" /> Triage incident
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
        <DialogContent className="sm:max-w-lg">
          {closeOpen && (
            <CloseIncidentForm
              incidentId={incident.id}
              context={closeContext}
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

type Outcome = "NoAction" | "LinkExisting" | "SpawnDraft";

function CloseIncidentForm({
  incidentId,
  context,
  onDone,
}: {
  incidentId: string;
  context: CloseContext;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    closeIncident,
    null,
  );
  const fe = state?.fieldErrors ?? {};
  const [outcome, setOutcome] = useState<Outcome>("NoAction");

  useEffect(() => {
    if (state?.ok) {
      onDone();
      toast.success("Incident closed.");
      router.refresh();
    }
  }, [state, onDone, router]);

  const canLink = context.canLinkExisting && context.assessments.length > 0;
  const canSpawn = context.canSpawnDraft && context.hasArea;

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
        <input type="hidden" name="closureOutcome" value={outcome} />

        {state && !state.ok && state.error && (
          <p className="rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
            {state.error}
          </p>
        )}

        <Field label="Closing notes" required error={fe.closureNotes}>
          <Textarea name="closureNotes" rows={4} autoFocus required />
        </Field>

        <fieldset className="space-y-2">
          <legend className="eyebrow mb-1">Risk-assessment follow-up</legend>

          <OutcomeRadio
            checked={outcome === "NoAction"}
            onChange={() => setOutcome("NoAction")}
            title="No action needed"
            hint="No control failed and no new hazard surfaced."
          />
          <OutcomeRadio
            checked={outcome === "LinkExisting"}
            onChange={() => setOutcome("LinkExisting")}
            title="A control failed — flag an assessment for review"
            hint={
              canLink
                ? "Links this incident and raises a review request."
                : "No assessments available to link in this centre."
            }
            disabled={!canLink}
          />
          <OutcomeRadio
            checked={outcome === "SpawnDraft"}
            onChange={() => setOutcome("SpawnDraft")}
            title="New hazard — create a draft assessment"
            hint={
              canSpawn
                ? "Seeds a draft assessment for this incident's area."
                : !context.hasArea
                  ? "This incident has no area, so a draft can't be seeded."
                  : "You don't have permission to create assessments."
            }
            disabled={!canSpawn}
          />
        </fieldset>

        {outcome === "LinkExisting" && (
          <div className="space-y-3.5 rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-4">
            <Field label="Assessment whose control failed" required error={fe.riskAssessmentId}>
              <Select name="riskAssessmentId" defaultValue="">
                <option value="">Select an assessment…</option>
                {context.assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.reference} · {a.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Review note" hint="Optional — what should the reviewer look at?">
              <Textarea name="reviewNotes" rows={2} />
            </Field>
          </div>
        )}

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

function OutcomeRadio({
  checked,
  onChange,
  title,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-card)] border p-3 text-sm ${
        checked ? "border-primary bg-primary/5" : "border-line"
      } ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-line-strong"}`}
    >
      <input
        type="radio"
        name="closureOutcomeRadio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 size-4"
      />
      <span>
        <span className="font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
