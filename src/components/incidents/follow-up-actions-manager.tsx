"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ActionStatusBadge } from "@/components/incidents/incident-badges";
import {
  addFollowUpAction,
  deleteFollowUpAction,
  setActionStatus,
  updateFollowUpAction,
} from "@/lib/actions/incidents";
import { ACTION_STATUSES } from "@/lib/incidents/constants";
import { formatDate, toDateInputValue } from "@/lib/utils";
import type { FormState } from "@/lib/form";
import type { FollowUpAction, UserOption } from "@/lib/incidents/types";

export function FollowUpActionsManager({
  incidentId,
  actions,
  users,
  canManage,
}: {
  incidentId: string;
  actions: FollowUpAction[];
  users: UserOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpAction | null>(null);
  const [deleting, setDeleting] = useState<FollowUpAction | null>(null);
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
    if (!deleting) return;
    startDeleteTransition(async () => {
      const res = await deleteFollowUpAction(deleting.id);
      if (res && !res.ok) {
        toast.error(res.error ?? "Could not delete the action.");
        return;
      }
      toast.success("Action deleted.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Follow-up actions{" "}
          <span className="font-normal text-muted-foreground">
            ({actions.length})
          </span>
        </CardTitle>
        {canManage && (
          <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add action
          </Button>
        )}
      </CardHeader>

      <div className="space-y-3 p-5">
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-up actions yet.</p>
        ) : (
          actions.map((a) => (
            <div
              key={a.id}
              className="rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{a.description}</p>
                    <ActionStatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-ink-soft">
                    Assigned to {a.assignedTo} · Due {formatDate(a.dueDate)}
                  </p>
                  {a.status === "Complete" && a.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      Completed {formatDate(a.completedAt)}
                      {a.completedBy ? ` by ${a.completedBy}` : ""}
                    </p>
                  )}
                  {a.notes && (
                    <p className="text-sm text-ink-soft">{a.notes}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {a.status !== "Complete" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => setActionStatus(a.id, "Complete"),
                            "Action marked complete.",
                          )
                        }
                      >
                        <Check className="size-4" /> Mark complete
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(a)}
                      aria-label="Edit action"
                      title="Edit action"
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(a)}
                      aria-label="Delete action"
                      title="Delete action"
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
            <ActionForm
              mode="add"
              incidentId={incidentId}
              users={users}
              onDone={() => setAddOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <ActionForm
              mode="edit"
              action={editing}
              users={users}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this follow-up action?"
        description={deleting?.description}
        confirmLabel="Delete action"
        pendingLabel="Deleting…"
        variant="danger"
        pending={deletePending}
        onConfirm={onDelete}
      />
    </Card>
  );
}

type ActionFormProps = (
  | { mode: "add"; incidentId: string; action?: undefined; onDone: () => void }
  | { mode: "edit"; action: FollowUpAction; incidentId?: undefined; onDone: () => void }
) & { users: UserOption[] };

function ActionForm(props: ActionFormProps) {
  const { mode, onDone, users } = props;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    mode === "add" ? addFollowUpAction : updateFollowUpAction,
    null,
  );
  const fe = state?.fieldErrors ?? {};
  const a = props.mode === "edit" ? props.action : null;

  useEffect(() => {
    if (state?.ok) {
      onDone();
      toast.success(mode === "add" ? "Action added." : "Action updated.");
      router.refresh();
    }
  }, [state, onDone, router, mode]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "add" ? "Add follow-up action" : "Edit follow-up action"}</DialogTitle>
        <DialogDescription>
          A corrective or preventive action raised during the investigation.
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-3.5">
        {mode === "add" ? (
          <input type="hidden" name="incidentId" value={props.incidentId} />
        ) : (
          <input type="hidden" name="id" value={a!.id} />
        )}

        {state && !state.ok && state.error && (
          <p className="rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
            {state.error}
          </p>
        )}

        <Field label="Description" required error={fe.description}>
          <Textarea
            name="description"
            rows={2}
            defaultValue={a?.description ?? ""}
            autoFocus
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assigned to" required error={fe.assignedTo}>
            <Select name="assignedTo" defaultValue={a?.assignedTo ?? ""} required>
              <option value="" disabled>
                Select a user…
              </option>
              {/* Preserve a legacy/non-user assignee when editing. */}
              {a?.assignedTo && !users.some((u) => u.name === a.assignedTo) && (
                <option value={a.assignedTo}>{a.assignedTo}</option>
              )}
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date" required error={fe.dueDate}>
            <Input
              type="date"
              name="dueDate"
              defaultValue={toDateInputValue(a?.dueDate)}
              required
            />
          </Field>
        </div>
        {mode === "edit" && (
          <>
            <Field label="Status" error={fe.status}>
              <Select name="status" defaultValue={a?.status ?? "Open"}>
                {ACTION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes" error={fe.notes}>
              <Textarea name="notes" rows={2} defaultValue={a?.notes ?? ""} />
            </Field>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "add" ? "Add action" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
