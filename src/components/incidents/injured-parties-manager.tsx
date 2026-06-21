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
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import {
  addInjuredParty,
  deleteInjuredParty,
  updateInjuredParty,
} from "@/lib/actions/incidents";
import {
  INJURED_PARTY_TYPES,
  INJURED_PARTY_TYPE_LABELS,
  TREATMENTS,
  TREATMENT_LABELS,
} from "@/lib/incidents/constants";
import type { FormState } from "@/lib/form";
import type { InjuredParty } from "@/lib/incidents/types";

export function InjuredPartiesManager({
  incidentId,
  parties,
  canManage,
}: {
  incidentId: string;
  parties: InjuredParty[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<InjuredParty | null>(null);
  const [deleting, setDeleting] = useState<InjuredParty | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  const onDelete = () => {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const res = await deleteInjuredParty(deleting.id);
      if (res && !res.ok) {
        toast.error(res.error ?? "Could not delete the injured party.");
        return;
      }
      toast.success("Injured party deleted.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Injured parties{" "}
          <span className="font-normal text-muted-foreground">
            ({parties.length})
          </span>
        </CardTitle>
        {canManage && (
          <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add injured party
          </Button>
        )}
      </CardHeader>

      <div className="space-y-3 p-5">
        {parties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No injured parties recorded.</p>
        ) : (
          parties.map((p) => (
            <div
              key={p.id}
              className="rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <p className="font-medium text-ink">
                    {p.name}{" "}
                    <span className="font-normal text-ink-soft">
                      — {INJURED_PARTY_TYPE_LABELS[p.partyType] ?? p.partyType}
                    </span>
                  </p>
                  {p.memberId && (
                    <p className="text-xs text-muted-foreground">Member ID: {p.memberId}</p>
                  )}
                  <p className="text-sm text-ink-soft">
                    Injury: {p.injuryNature} · Body part: {p.bodyPartAffected} ·
                    Treatment: {TREATMENT_LABELS[p.treatment] ?? p.treatment}
                  </p>
                  {p.hospitalName && (
                    <p className="text-sm text-ink-soft">
                      Hospital: {p.hospitalName}
                    </p>
                  )}
                  {p.lostTime && (
                    <p className="text-sm text-ink-soft">
                      Lost time
                      {p.lostTimeDays != null ? `: ${p.lostTimeDays} day(s)` : ""}
                    </p>
                  )}
                  {(p.contactPhone || p.contactEmail) && (
                    <p className="text-xs text-muted-foreground">
                      {[p.contactPhone, p.contactEmail]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {p.additionalNotes && (
                    <p className="text-sm text-ink-soft">{p.additionalNotes}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      aria-label="Edit injured party"
                      title="Edit injured party"
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      aria-label="Delete injured party"
                      title="Delete injured party"
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
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          {addOpen && (
            <InjuredPartyForm
              mode="add"
              incidentId={incidentId}
              onDone={() => setAddOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          {editing && (
            <InjuredPartyForm
              mode="edit"
              party={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this injured party?"
        description={deleting ? `${deleting.name}’s record will be removed.` : undefined}
        confirmLabel="Delete injured party"
        pendingLabel="Deleting…"
        variant="danger"
        pending={deletePending}
        onConfirm={onDelete}
      />
    </Card>
  );
}

type InjuredPartyFormProps =
  | { mode: "add"; incidentId: string; party?: undefined; onDone: () => void }
  | { mode: "edit"; party: InjuredParty; incidentId?: undefined; onDone: () => void };

function InjuredPartyForm(props: InjuredPartyFormProps) {
  const { mode, onDone } = props;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    mode === "add" ? addInjuredParty : updateInjuredParty,
    null,
  );
  const fe = state?.fieldErrors ?? {};
  const p = props.mode === "edit" ? props.party : null;
  const [partyType, setPartyType] = useState(p?.partyType ?? INJURED_PARTY_TYPES[0].value);

  useEffect(() => {
    if (state?.ok) {
      onDone();
      toast.success(mode === "add" ? "Injured party added." : "Injured party updated.");
      router.refresh();
    }
  }, [state, onDone, router, mode]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "add" ? "Add injured party" : "Edit injured party"}
        </DialogTitle>
        <DialogDescription>
          Record who was injured and the treatment given.
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-3.5">
        {mode === "add" ? (
          <input type="hidden" name="incidentId" value={props.incidentId} />
        ) : (
          <input type="hidden" name="id" value={p!.id} />
        )}

        {state && !state.ok && state.error && (
          <p className="rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" required error={fe.partyType}>
            <Select name="partyType" value={partyType} onChange={(e) => setPartyType(e.target.value)}>
              {INJURED_PARTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Name" required error={fe.name}>
            <Input name="name" defaultValue={p?.name ?? ""} required />
          </Field>
        </div>
        {partyType === "Member" && (
          <Field label="Member ID" error={fe.memberId}>
            <Input name="memberId" defaultValue={p?.memberId ?? ""} placeholder="e.g. LWB26571" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nature of injury" hint="The injury itself, not how it happened." required error={fe.injuryNature}>
            <Input name="injuryNature" defaultValue={p?.injuryNature ?? ""} required />
          </Field>
          <Field label="Body part affected" required error={fe.bodyPartAffected}>
            <Input
              name="bodyPartAffected"
              defaultValue={p?.bodyPartAffected ?? ""}
              required
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Treatment" required error={fe.treatment}>
            <Select name="treatment" defaultValue={p?.treatment ?? TREATMENTS[0].value}>
              {TREATMENTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hospital name" error={fe.hospitalName}>
            <Input name="hospitalName" defaultValue={p?.hospitalName ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <Field label="Lost-time days" error={fe.lostTimeDays}>
            <Input
              type="number"
              name="lostTimeDays"
              min={0}
              defaultValue={p?.lostTimeDays != null ? String(p.lostTimeDays) : ""}
            />
          </Field>
          <label className="mb-2.5 flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="lostTime"
              defaultChecked={p?.lostTime ?? false}
              className="size-4 rounded border-line-strong text-primary focus-visible:ring-2 focus-visible:ring-ring/25"
            />
            Lost time from work
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact (person / next of kin)" error={fe.contactPhone}>
            <Input name="contactPhone" defaultValue={p?.contactPhone ?? ""} />
          </Field>
          <Field label="Contact email" error={fe.contactEmail}>
            <Input
              type="email"
              name="contactEmail"
              defaultValue={p?.contactEmail ?? ""}
            />
          </Field>
        </div>
        <Field label="Additional notes" error={fe.additionalNotes}>
          <Textarea
            name="additionalNotes"
            rows={2}
            defaultValue={p?.additionalNotes ?? ""}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : mode === "add"
                ? "Add injured party"
                : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
