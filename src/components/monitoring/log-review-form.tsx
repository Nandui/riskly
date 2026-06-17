"use client";

import { useActionState, useEffect } from "react";
import { logReview } from "@/lib/actions/reviews";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { REVIEW_OUTCOMES, ASSESSMENT_STATUSES } from "@/lib/constants";
import type { FormState } from "@/lib/form";

export function LogReviewForm({
  assessmentId,
  todayInput,
  onDone,
}: {
  assessmentId: string;
  todayInput: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    logReview,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      {state?.error && (
        <p className="text-xs font-medium text-critical">{state.error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Review date">
          <Input type="date" name="reviewedDate" defaultValue={todayInput} />
        </Field>
        <Field label="Reviewed by">
          <Input name="reviewerName" placeholder="Name" />
        </Field>
        <Field label="Outcome">
          <Select name="outcome" defaultValue="NoChanges">
            {REVIEW_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Set status">
          <Select name="newStatus" defaultValue="">
            <option value="">No change</option>
            {ASSESSMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea
          name="notes"
          rows={2}
          placeholder="What was checked or changed?"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save review"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
