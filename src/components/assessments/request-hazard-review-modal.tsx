"use client";

import { useActionState, useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
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
import { requestReview } from "@/lib/actions/review-requests";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form";

type Issue = "" | "missing" | "incorrect";

export function RequestHazardReviewButton({
  assessmentId,
  hazardName,
  controls,
}: {
  assessmentId: string;
  hazardName: string;
  controls: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
      >
        <MessageSquarePlus className="size-3.5" /> Request review
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <RequestForm
            assessmentId={assessmentId}
            hazardName={hazardName}
            controls={controls}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildNotes(
  hazardName: string,
  aspects: { riskFactor: Issue; consequence: Issue; controls: Issue },
  selectedControls: string[],
  why: string,
) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const parts: string[] = [];
  if (aspects.riskFactor) parts.push(`Risk factor: ${cap(aspects.riskFactor)}`);
  if (aspects.consequence)
    parts.push(`Consequence: ${cap(aspects.consequence)}`);
  if (aspects.controls) {
    const which = selectedControls.length
      ? ` — ${selectedControls.join("; ")}`
      : "";
    parts.push(`Controls: ${cap(aspects.controls)}${which}`);
  }
  const flags = parts.length ? parts.join("\n") + "\n\n" : "";
  return `Review requested on hazard “${hazardName}”.\n${flags}Why: ${why.trim()}`;
}

function RequestForm({
  assessmentId,
  hazardName,
  controls,
  onDone,
}: {
  assessmentId: string;
  hazardName: string;
  controls: string[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    requestReview,
    null,
  );
  const [aspects, setAspects] = useState<{
    riskFactor: Issue;
    consequence: Issue;
    controls: Issue;
  }>({ riskFactor: "", consequence: "", controls: "" });
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [why, setWhy] = useState("");

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const toggleControl = (c: string) =>
    setSelectedControls((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const notes = buildNotes(hazardName, aspects, selectedControls, why);
  const canSubmit = why.trim().length >= 3;

  return (
    <>
      <DialogHeader className="border-b border-line p-5 pr-12 text-left">
        <DialogTitle>Request review</DialogTitle>
        <DialogDescription>
          Flag what needs checking on “{hazardName}” and explain why — this
          raises a review request on the assessment.
        </DialogDescription>
      </DialogHeader>

      <form action={action} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <input type="hidden" name="notes" value={notes} />

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <p className="eyebrow mb-2">What needs review?</p>
            <div className="space-y-2.5">
              <AspectRow
                label="Risk factor"
                value={aspects.riskFactor}
                onChange={(v) => setAspects((a) => ({ ...a, riskFactor: v }))}
              />
              <AspectRow
                label="Consequence"
                value={aspects.consequence}
                onChange={(v) => setAspects((a) => ({ ...a, consequence: v }))}
              />
              <AspectRow
                label="Current controls"
                value={aspects.controls}
                onChange={(v) => setAspects((a) => ({ ...a, controls: v }))}
              />
              {aspects.controls && controls.length > 0 && (
                <div className="space-y-2 rounded-lg border border-line bg-surface-2/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Which controls?
                  </p>
                  {controls.map((c) => (
                    <label
                      key={c}
                      className="flex items-start gap-2 text-sm text-ink-soft"
                    >
                      <input
                        type="checkbox"
                        checked={selectedControls.includes(c)}
                        onChange={() => toggleControl(c)}
                        className="mt-0.5 size-4 rounded border-line-strong accent-primary"
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="why"
              className="eyebrow mb-1.5 block"
            >
              Why <span className="text-critical">*</span>
            </label>
            <Textarea
              id="why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={3}
              placeholder="Explain what's wrong or missing and what should change."
            />
          </div>

          {state && !state.ok && (state.error || state.fieldErrors?.notes) && (
            <p className="text-sm font-medium text-critical">
              {state.error ?? state.fieldErrors?.notes}
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-line p-4">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !canSubmit}>
            {pending ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function AspectRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Issue;
  onChange: (value: Issue) => void;
}) {
  const options: { v: Issue; l: string }[] = [
    { v: "", l: "—" },
    { v: "missing", l: "Missing" },
    { v: "incorrect", l: "Incorrect" },
  ];
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="inline-flex gap-0.5 rounded-md bg-surface-2 p-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              value === o.v
                ? "bg-surface text-ink shadow-xs"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}
