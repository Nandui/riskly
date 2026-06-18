"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Printer, Trash2 } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { deleteAssessment } from "@/lib/actions/assessments";

export function AssessmentActions({
  id,
  canEdit,
}: {
  id: string;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {canEdit && (
        <Link
          href={`/assessments/${id}/edit`}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <Pencil className="size-4" /> Edit
        </Link>
      )}
      <Button variant="ghost" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> Print
      </Button>
      {canEdit &&
        (confirm ? (
        <span className="flex items-center gap-1.5">
          <Button
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void deleteAssessment(id);
              })
            }
          >
            {pending ? "Deleting…" : "Confirm delete"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        </span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-critical hover:bg-critical-bg"
          onClick={() => setConfirm(true)}
          aria-label="Delete assessment"
        >
          <Trash2 className="size-4" />
        </Button>
        ))}
    </div>
  );
}
