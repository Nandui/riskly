"use client";

import { useTransition } from "react";
import { ShieldCheck, UserRound, Crown, Clock, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
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
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => withdrawApproval(assessmentId, kind))}
              className="no-print mt-1.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-critical hover:underline disabled:opacity-50"
            >
              {pending ? "Withdrawing…" : "Withdraw"}
            </button>
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
