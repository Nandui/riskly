"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Field, Input, Textarea } from "@/components/ui/form";
import {
  addWitness,
  deleteWitness,
  updateWitness,
} from "@/lib/actions/incidents";
import { formatDate, toDateInputValue } from "@/lib/utils";
import type { FormState } from "@/lib/form";
import type { Witness } from "@/lib/incidents/types";

export function WitnessesManager({
  incidentId,
  witnesses,
  canManage,
}: {
  incidentId: string;
  witnesses: Witness[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Witness | null>(null);
  const [deleting, setDeleting] = useState<Witness | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const onDelete = () => {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const res = await deleteWitness(deleting.id);
      if (res && !res.ok) {
        toast.error(res.error ?? "Could not delete the witness.");
        return;
      }
      toast.success("Witness deleted.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Witnesses{" "}
          <span className="font-normal text-muted-foreground">
            ({witnesses.length})
          </span>
        </CardTitle>
        {canManage && (
          <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add witness
          </Button>
        )}
      </CardHeader>

      <div className="space-y-3 p-5">
        {witnesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No witnesses recorded yet.</p>
        ) : (
          witnesses.map((w) => (
            <div
              key={w.id}
              className="rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <p className="font-medium text-ink">
                    {w.name}{" "}
                    <span className="font-normal text-ink-soft">
                      — {w.roleOrRelation}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">
                      ({formatDate(w.statementDate)})
                    </span>
                  </p>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {w.statement}
                  </p>
                  {(w.contactPhone || w.contactEmail) && (
                    <p className="text-xs text-muted-foreground">
                      {[w.contactPhone, w.contactEmail]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(w)}
                      aria-label="Edit witness"
                      title="Edit witness"
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(w)}
                      aria-label="Delete witness"
                      title="Delete witness"
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-critical-bg hover:text-critical"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          {addOpen && (
            <WitnessForm
              mode="add"
              incidentId={incidentId}
              onDone={() => setAddOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <WitnessForm
              mode="edit"
              witness={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this witness?"
        description={deleting ? `${deleting.name}’s statement will be removed.` : undefined}
        confirmLabel="Delete witness"
        pendingLabel="Deleting…"
        variant="danger"
        pending={deletePending}
        onConfirm={onDelete}
      />
    </Card>
  );
}

type WitnessFormProps =
  | { mode: "add"; incidentId: string; witness?: undefined; onDone: () => void }
  | { mode: "edit"; witness: Witness; incidentId?: undefined; onDone: () => void };

function WitnessForm(props: WitnessFormProps) {
  const { mode, onDone } = props;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    mode === "add" ? addWitness : updateWitness,
    null,
  );
  const fe = state?.fieldErrors ?? {};
  const w = props.mode === "edit" ? props.witness : null;

  useEffect(() => {
    if (state?.ok) {
      onDone();
      toast.success(mode === "add" ? "Witness added." : "Witness updated.");
      router.refresh();
    }
  }, [state, onDone, router, mode]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "add" ? "Add witness" : "Edit witness"}</DialogTitle>
        <DialogDescription>
          Record who saw what happened and their account.
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-3.5">
        {mode === "add" ? (
          <input type="hidden" name="incidentId" value={props.incidentId} />
        ) : (
          <input type="hidden" name="id" value={w!.id} />
        )}

        {state && !state.ok && state.error && (
          <p className="rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required error={fe.name}>
            <Input name="name" defaultValue={w?.name ?? ""} autoFocus required />
          </Field>
          <Field label="Role / relation" required error={fe.roleOrRelation}>
            <Input
              name="roleOrRelation"
              defaultValue={w?.roleOrRelation ?? ""}
              required
            />
          </Field>
        </div>
        <Field label="Statement date" required error={fe.statementDate}>
          <Input
            type="date"
            name="statementDate"
            defaultValue={toDateInputValue(w?.statementDate)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact phone" error={fe.contactPhone}>
            <Input name="contactPhone" defaultValue={w?.contactPhone ?? ""} />
          </Field>
          <Field label="Contact email" error={fe.contactEmail}>
            <Input
              type="email"
              name="contactEmail"
              defaultValue={w?.contactEmail ?? ""}
            />
          </Field>
        </div>
        <Field label="Statement" required error={fe.statement}>
          <Textarea
            name="statement"
            rows={4}
            defaultValue={w?.statement ?? ""}
            required
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "add" ? "Add witness" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
