"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import {
  Video,
  MessageSquareText,
  Pencil,
  Trash2,
  Plus,
  Clock,
} from "lucide-react";
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
import {
  addEvidenceRequest,
  deleteEvidenceRequest,
  updateEvidenceRequest,
} from "@/lib/actions/incidents";
import {
  EVIDENCE_REQUEST_KINDS,
  EVIDENCE_REQUEST_STATUSES,
  EVIDENCE_REQUEST_STATUS_META,
} from "@/lib/incidents/constants";
import { cn, formatDate, toDateInputValue } from "@/lib/utils";
import type { FormState } from "@/lib/form";
import type { EvidenceRequest, UserOption } from "@/lib/incidents/types";

function StatusBadge({ status }: { status: string }) {
  const m =
    EVIDENCE_REQUEST_STATUS_META[status] ??
    EVIDENCE_REQUEST_STATUS_META.Requested;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        m.pill,
      )}
    >
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

// "Pull within 3d" / "Overdue by 2d" for an outstanding CCTV request whose
// footage will be overwritten.
function RetentionCountdown({ deadline }: { deadline: Date }) {
  const days = differenceInCalendarDays(new Date(deadline), new Date());
  const overdue = days < 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        overdue ? "text-critical" : days <= 3 ? "text-high" : "text-muted-foreground",
      )}
    >
      <Clock className="size-3.5" />
      {overdue
        ? `Footage may be gone (${Math.abs(days)}d past)`
        : days === 0
          ? "Pull today"
          : `Pull within ${days}d`}
    </span>
  );
}

export function EvidenceRequestsManager({
  incidentId,
  requests,
  users,
  canManage,
}: {
  incidentId: string;
  requests: EvidenceRequest[];
  users: UserOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState<"CCTV" | "Information" | null>(null);
  const [editing, setEditing] = useState<EvidenceRequest | null>(null);
  const [deleting, setDeleting] = useState<EvidenceRequest | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const onDelete = () => {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const res = await deleteEvidenceRequest(deleting.id);
      if (res && !res.ok) {
        toast.error(res.error ?? "Could not delete the request.");
        return;
      }
      toast.success("Request removed.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            Evidence &amp; requests{" "}
            <span className="font-normal text-muted-foreground">
              ({requests.length})
            </span>
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Request CCTV before it&apos;s overwritten, or ask someone for a
            statement — and track it to a result.
          </p>
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAdding("CCTV")}>
              <Video className="size-4" /> Request CCTV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAdding("Information")}>
              <MessageSquareText className="size-4" /> Request info
            </Button>
          </div>
        )}
      </CardHeader>

      <div className="space-y-3 p-5">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No evidence requested yet.
          </p>
        ) : (
          requests.map((r) => {
            const Icon = r.kind === "CCTV" ? Video : MessageSquareText;
            return (
              <div
                key={r.id}
                className="rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <p className="font-medium text-ink">
                        {r.kind === "CCTV" ? "CCTV" : "Information"}
                        {r.source ? ` · ${r.source}` : ""}
                      </p>
                      <StatusBadge status={r.status} />
                      {r.status === "Requested" && r.retentionDeadline && (
                        <RetentionCountdown deadline={r.retentionDeadline} />
                      )}
                    </div>
                    {r.timeWindow && (
                      <p className="text-sm text-ink-soft">
                        Time window: {r.timeWindow}
                      </p>
                    )}
                    {r.detail && <p className="text-sm text-ink-soft">{r.detail}</p>}
                    <p className="text-xs text-muted-foreground">
                      {r.assignedTo ? `With ${r.assignedTo} · ` : ""}
                      Raised {formatDate(r.createdAt)}
                      {r.requestedBy ? ` by ${r.requestedBy}` : ""}
                    </p>
                    {r.outcomeRef && (
                      <p className="text-sm text-ink">
                        <span className="text-muted-foreground">Outcome: </span>
                        {r.outcomeRef}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        aria-label="Edit request"
                        title="Edit request"
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(r)}
                        aria-label="Delete request"
                        title="Delete request"
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-critical-bg hover:text-critical"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        {canManage && requests.length === 0 && (
          <Button variant="ghost" size="sm" onClick={() => setAdding("CCTV")}>
            <Plus className="size-4" /> Add the first request
          </Button>
        )}
      </div>

      <Dialog open={adding !== null} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent className="sm:max-w-lg">
          {adding && (
            <EvidenceForm
              mode="add"
              incidentId={incidentId}
              defaultKind={adding}
              users={users}
              onDone={() => setAdding(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <EvidenceForm
              mode="edit"
              request={editing}
              users={users}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this request?"
        description={deleting?.detail ?? "This evidence request will be removed."}
        confirmLabel="Delete request"
        pendingLabel="Deleting…"
        variant="danger"
        pending={deletePending}
        onConfirm={onDelete}
      />
    </Card>
  );
}

type EvidenceFormProps = (
  | { mode: "add"; incidentId: string; defaultKind: "CCTV" | "Information"; request?: undefined; onDone: () => void }
  | { mode: "edit"; request: EvidenceRequest; incidentId?: undefined; defaultKind?: undefined; onDone: () => void }
) & { users: UserOption[] };

function EvidenceForm(props: EvidenceFormProps) {
  const { mode, onDone, users } = props;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    mode === "add" ? addEvidenceRequest : updateEvidenceRequest,
    null,
  );
  const r = props.mode === "edit" ? props.request : null;
  const [kind, setKind] = useState<string>(
    props.mode === "edit" ? props.request.kind : props.defaultKind,
  );
  const [status, setStatus] = useState<string>(r?.status ?? "Requested");
  const fe = state?.fieldErrors ?? {};
  const isCctv = kind === "CCTV";

  useEffect(() => {
    if (state?.ok) {
      onDone();
      toast.success(mode === "add" ? "Request raised." : "Request updated.");
      router.refresh();
    }
  }, [state, onDone, router, mode]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "add" ? "Raise an evidence request" : "Edit evidence request"}
        </DialogTitle>
        <DialogDescription>
          {isCctv
            ? "Note the camera and time window, and who's pulling it before the footage is overwritten."
            : "Ask a named person for a statement or detail, and track the reply."}
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-3.5">
        {mode === "add" ? (
          <input type="hidden" name="incidentId" value={props.incidentId} />
        ) : (
          <input type="hidden" name="id" value={r!.id} />
        )}

        {state && !state.ok && state.error && (
          <p className="rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind" error={fe.kind}>
            <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              {EVIDENCE_REQUEST_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status" error={fe.status}>
            <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {EVIDENCE_REQUEST_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label={isCctv ? "Camera / area" : "Requested from"}
          error={fe.source}
        >
          <Input
            name="source"
            defaultValue={r?.source ?? ""}
            placeholder={isCctv ? "e.g. Pool-hall cam 3" : "e.g. Duty Manager, member"}
            autoFocus
          />
        </Field>

        {isCctv && (
          <Field label="Time window" error={fe.timeWindow}>
            <Input
              name="timeWindow"
              defaultValue={r?.timeWindow ?? ""}
              placeholder="e.g. 12:40–12:50"
            />
          </Field>
        )}

        <Field label="What's needed" error={fe.detail}>
          <Textarea
            name="detail"
            rows={2}
            defaultValue={r?.detail ?? ""}
            placeholder={
              isCctv
                ? "What the footage should show."
                : "What you're asking for."
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Assigned to" required error={fe.assignedToId}>
            <Select name="assignedToId" defaultValue={r?.assignedToId ?? ""} required>
              <option value="" disabled>
                Select a user…
              </option>
              {/* Preserve an assignee who is no longer in the active list. */}
              {r?.assignedToId && !users.some((u) => u.id === r.assignedToId) && (
                <option value={r.assignedToId}>{r.assignedTo ?? "Former user"}</option>
              )}
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={isCctv ? "Pull footage by" : "Needed by"}
            hint={isCctv ? "Before it's overwritten." : undefined}
            error={fe.retentionDeadline}
          >
            <Input
              type="date"
              name="retentionDeadline"
              defaultValue={toDateInputValue(r?.retentionDeadline ?? null)}
            />
          </Field>
        </div>

        {status !== "Requested" && (
          <Field
            label="Outcome / reference"
            hint="Clip reference, where it's stored, or the answer received."
            error={fe.outcomeRef}
          >
            <Input
              name="outcomeRef"
              defaultValue={r?.outcomeRef ?? ""}
              placeholder="e.g. clip saved to incident drive / 'no camera covers that spot'"
            />
          </Field>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : mode === "add"
                ? isCctv
                  ? "Request CCTV"
                  : "Raise request"
                : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
