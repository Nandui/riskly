"use client";

import { useTransition } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { setCenterActive } from "@/lib/actions/centers";
import { cn } from "@/lib/utils";

export function CenterArchiveButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void setCenterActive(id, !isActive);
        })
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-ink",
        pending && "opacity-60",
      )}
    >
      {isActive ? (
        <>
          <Archive className="size-3.5" /> Archive
        </>
      ) : (
        <>
          <RotateCcw className="size-3.5" /> Restore
        </>
      )}
    </button>
  );
}
