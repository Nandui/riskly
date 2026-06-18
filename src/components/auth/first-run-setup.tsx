"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createFirstAdmin } from "@/lib/actions/auth";

export function FirstRunSetup() {
  const [error, formAction, isPending] = useActionState(
    createFirstAdmin,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4 text-left">
      <Field label="Your name" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@leisureworldcork.com"
        />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      {error && (
        <p className="rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating…" : "Create admin account"}
      </Button>
    </form>
  );
}
