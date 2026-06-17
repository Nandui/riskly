"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCenter } from "@/lib/actions/centers";
import { Button } from "@/components/ui/button";

export function CenterDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirm) {
    return (
      <Button
        variant="ghost"
        className="text-critical hover:bg-critical-bg"
        onClick={() => setConfirm(true)}
      >
        <Trash2 className="size-4" /> Delete centre
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-critical-line bg-critical-bg/50 p-4">
      <p className="text-sm font-medium text-ink">
        Delete this centre permanently? Its areas are removed too.
      </p>
      {error && <p className="text-sm font-medium text-critical">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteCenter(id);
              if (res && !res.ok) setError(res.error ?? "Could not delete.");
            })
          }
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setConfirm(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
