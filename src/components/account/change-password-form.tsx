"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { changeOwnPassword } from "@/lib/actions/account";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(changeOwnPassword, null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs"
    >
      <h2 className="text-sm font-semibold text-ink">Change password</h2>
      <div className="mt-4 space-y-3">
        <Field
          label="Current password"
          htmlFor="currentPassword"
          error={state?.fieldErrors?.currentPassword}
        >
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field
          label="New password"
          htmlFor="newPassword"
          error={state?.fieldErrors?.newPassword}
          hint="At least 8 characters."
        >
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
      </div>

      {state?.ok && (
        <p className="mt-3 rounded-lg border border-brand/25 bg-brand-soft px-3 py-2 text-sm font-medium text-brand-strong">
          Password updated.
        </p>
      )}
      {state && !state.ok && state.error && (
        <p className="mt-3 text-sm font-medium text-critical">{state.error}</p>
      )}

      <div className="mt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
