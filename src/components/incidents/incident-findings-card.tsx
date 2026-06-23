"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { updateInvestigationFindings } from "@/lib/actions/incidents";
import {
  ROOT_CAUSE_CATEGORIES,
  ROOT_CAUSE_CATEGORY_META,
} from "@/lib/incidents/constants";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form";

// The investigation's conclusion: a root-cause class + analysis (why it
// happened) and the overall finding. Editable by managers; read-only otherwise.
export function IncidentFindingsCard({
  incidentId,
  rootCauseCategory,
  rootCause,
  investigationConclusion,
  canManage,
}: {
  incidentId: string;
  rootCauseCategory: string | null;
  rootCause: string | null;
  investigationConclusion: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateInvestigationFindings,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Findings saved.");
      router.refresh();
    }
  }, [state, router]);

  const hasAny =
    !!rootCauseCategory || !!rootCause?.trim() || !!investigationConclusion?.trim();
  if (!canManage && !hasAny) return null;

  const catMeta = rootCauseCategory
    ? ROOT_CAUSE_CATEGORY_META[rootCauseCategory]
    : null;

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Findings &amp; root cause</CardTitle>
        </CardHeader>
        <div className="space-y-4 p-5">
          <div>
            <h3 className="eyebrow mb-1.5">Root cause</h3>
            {catMeta && (
              <span
                className={cn(
                  "mb-1.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                  catMeta.pill,
                )}
              >
                {catMeta.label}
              </span>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {rootCause?.trim() || "—"}
            </p>
          </div>
          <div>
            <h3 className="eyebrow mb-1.5">Conclusion</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {investigationConclusion?.trim() || "—"}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Findings &amp; root cause</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What the investigation concluded — the why, not just the what.
          </p>
        </div>
      </CardHeader>
      <form action={formAction} className="space-y-4 p-5">
        <input type="hidden" name="incidentId" value={incidentId} />
        <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
          <Field label="Root cause category">
            <Select name="rootCauseCategory" defaultValue={rootCauseCategory ?? ""}>
              <option value="">Not set</option>
              {ROOT_CAUSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Root-cause analysis" hint="Why it happened — the underlying cause.">
            <Textarea
              name="rootCause"
              rows={3}
              defaultValue={rootCause ?? ""}
              placeholder="e.g. Poolside surface was not dried after the AFR clean-up, and the wet-floor signage was not redeployed."
            />
          </Field>
        </div>
        <Field label="Conclusion" hint="The overall finding of the investigation.">
          <Textarea
            name="investigationConclusion"
            rows={3}
            defaultValue={investigationConclusion ?? ""}
            placeholder="What you concluded, and what changes follow from it."
          />
        </Field>
        {state && !state.ok && state.error && (
          <p className="text-xs font-medium text-critical">{state.error}</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save findings"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
