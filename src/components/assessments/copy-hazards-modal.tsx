"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonClasses } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form";
import { copyHazards } from "@/lib/actions/assessments";
import { cn } from "@/lib/utils";

export interface CopyHazardItem {
  id: string;
  seq: number;
  hazard: string;
}

export interface CopyTargetItem {
  id: string;
  reference: string;
  centerName: string;
  title: string;
}

export function CopyHazardsButton({
  sourceId,
  sourceRef,
  hazards,
  targets,
}: {
  sourceId: string;
  sourceRef: string;
  hazards: CopyHazardItem[];
  targets: CopyTargetItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses({ variant: "secondary", size: "sm" })}
      >
        <Copy className="size-4" /> Copy
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {/* Remount per-open so the selection resets each time. */}
          {open && (
            <CopyForm
              sourceId={sourceId}
              sourceRef={sourceRef}
              hazards={hazards}
              targets={targets}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CopyForm({
  sourceId,
  sourceRef,
  hazards,
  targets,
  onDone,
}: {
  sourceId: string;
  sourceRef: string;
  hazards: CopyHazardItem[];
  targets: CopyTargetItem[];
  onDone: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(hazards.map((h) => h.id)),
  );
  const [pending, start] = useTransition();

  // Group the target assessments by centre for the picker.
  const grouped = useMemo(() => {
    const m = new Map<string, CopyTargetItem[]>();
    for (const t of targets) {
      const arr = m.get(t.centerName) ?? [];
      arr.push(t);
      m.set(t.centerName, arr);
    }
    return Array.from(m.entries());
  }, [targets]);

  const allSelected = selected.size === hazards.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(hazards.map((h) => h.id)));

  const target = targets.find((t) => t.id === targetId);
  const canCopy = Boolean(targetId) && selected.size > 0 && !pending;

  const submit = () => {
    if (!canCopy) return;
    start(async () => {
      const res = await copyHazards(sourceId, targetId, [...selected]);
      if (res && !res.ok) {
        toast.error(res.error ?? "Couldn't copy the hazards.");
        return;
      }
      toast.success(
        `Copied ${selected.size} hazard${selected.size === 1 ? "" : "s"} to ${
          target?.reference ?? "the assessment"
        }.`,
      );
      onDone();
    });
  };

  const noTargets = targets.length === 0;

  return (
    <>
      <DialogHeader className="border-b border-line p-5 pr-12 text-left">
        <DialogTitle>Copy hazards</DialogTitle>
        <DialogDescription>
          Append hazards from {sourceRef} to another assessment. This re-opens
          the target for review and clears any approval it has.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        {noTargets ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted-foreground">
            There are no other assessments to copy into yet.
          </p>
        ) : (
          <>
            <div>
              <Label htmlFor="copy-target">Copy into</Label>
              <Select
                id="copy-target"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                <option value="">Select an assessment…</option>
                {grouped.map(([centre, items]) => (
                  <optgroup key={centre} label={centre}>
                    {items.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.reference} — {t.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="mb-0">
                  Hazards{" "}
                  <span className="font-normal text-muted-foreground">
                    ({selected.size}/{hazards.length})
                  </span>
                </Label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              </div>
              <ul className="space-y-1.5">
                {hazards.map((h) => {
                  const ref = `${sourceRef}-HZ-${String(h.seq).padStart(3, "0")}`;
                  const checked = selected.has(h.id);
                  return (
                    <li key={h.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                          checked
                            ? "border-primary/40 bg-accent/40"
                            : "border-line hover:bg-surface-2/50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(h.id)}
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="block font-mono text-[0.625rem] tracking-wide text-faint">
                            {ref}
                          </span>
                          <span className="block truncate text-sm font-medium text-ink">
                            {h.hazard}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>

      <DialogFooter className="border-t border-line p-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={!canCopy}>
          {pending
            ? "Copying…"
            : `Copy ${selected.size} hazard${selected.size === 1 ? "" : "s"}`}
        </Button>
      </DialogFooter>
    </>
  );
}
