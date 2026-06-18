"use client";

import { useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveAssessment, revokeApproval } from "@/lib/actions/approvals";

export function ApproveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => start(() => void approveAssessment(id))}
    >
      <ShieldCheck className="size-4" />
      {pending ? "Approving…" : "Approve"}
    </Button>
  );
}

export function WithdrawApprovalButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => void revokeApproval(id))}
      className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-critical hover:underline disabled:opacity-50"
    >
      {pending ? "Withdrawing…" : "Withdraw approval"}
    </button>
  );
}
