"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, UserRound, Crown, Clock, type LucideIcon } from "lucide-react";
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
import { grantApproval, withdrawApproval } from "@/lib/actions/approvals";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form";

type Kind = "owner" | "ceo";

interface SlotData {
  name: string | null;
  date: string | null;
  canManage: boolean;
}

export function ApprovalCard({
  assessmentId,
  owner,
  ceo,
}: {
  assessmentId: string;
  owner: SlotData;
  ceo: SlotData;
}) {
  const both = Boolean(owner.name) && Boolean(ceo.name);
  return (
    <div className="space-y-2.5">
      <ApprovalSlot
        assessmentId={assessmentId}
        kind="owner"
        label="Owner"
        Icon={UserRound}
        data={owner}
      />
      <ApprovalSlot
        assessmentId={assessmentId}
        kind="ceo"
        label="CEO"
        Icon={Crown}
        data={ceo}
      />
      {both && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-low">
          <ShieldCheck className="size-3.5" /> Fully signed off
        </p>
      )}
    </div>
  );
}

function ApprovalSlot({
  assessmentId,
  kind,
  label,
  Icon,
  data,
}: {
  assessmentId: string;
  kind: Kind;
  label: string;
  Icon: LucideIcon;
  data: SlotData;
}) {
  const [pending, start] = useTransition();
  const approved = Boolean(data.name);

  const run = (action: () => Promise<FormState>) =>
    start(async () => {
      const res = await action();
      if (res && !res.ok) toast.error(res.error ?? "Something went wrong.");
    });

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        approved ? "border-low/30 bg-low-bg/50" : "border-line bg-surface-2/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3.5 text-faint" />
          {label} approval
        </span>
        {approved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-low-bg px-2 py-0.5 text-[0.7rem] font-semibold text-low">
            <ShieldCheck className="size-3" /> Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-faint">
            <Clock className="size-3" /> Pending
          </span>
        )}
      </div>

      {approved ? (
        <div className="mt-1.5">
          <p className="text-sm font-medium text-ink">{data.name}</p>
          {data.date && (
            <p className="text-xs text-muted-foreground">{data.date}</p>
          )}
          {data.canManage && (
            <WithdrawButton
              assessmentId={assessmentId}
              kind={kind}
              label={label}
            />
          )}
        </div>
      ) : data.canManage ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => grantApproval(assessmentId, kind))}
          className="no-print mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <ShieldCheck className="size-3.5" />
          {pending ? "Approving…" : `Approve as ${label}`}
        </button>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Awaiting {label} sign-off.
        </p>
      )}
    </div>
  );
}

// Withdrawing requires a reason, which is recorded in the activity log.
function WithdrawButton({
  assessmentId,
  kind,
  label,
}: {
  assessmentId: string;
  kind: Kind;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const confirm = () => {
    const note = reason.trim();
    if (!note) return;
    start(async () => {
      const res = await withdrawApproval(assessmentId, kind, note);
      if (res && !res.ok) {
        toast.error(res.error ?? "Couldn't withdraw the approval.");
        return;
      }
      toast.success(`${label} approval withdrawn.`);
      setOpen(false);
      setReason("");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print mt-1.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-critical hover:underline"
      >
        Withdraw
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw {label} approval?</DialogTitle>
            <DialogDescription>
              This re-opens the assessment for review. The reason is recorded in
              the activity log.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Why is this approval being withdrawn?"
          />
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
              onClick={confirm}
              disabled={pending || !reason.trim()}
            >
              {pending ? "Withdrawing…" : "Withdraw approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
