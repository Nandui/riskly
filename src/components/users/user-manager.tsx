"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/constants";
import { createUser } from "@/lib/actions/users";
import { UsersTable, type UserItem } from "@/components/users/users-table";

export type { UserItem };

export function UserManager({ users }: { users: UserItem[] }) {
  return (
    <div className="space-y-4">
      <NewUserForm />
      <UsersTable users={users} />
    </div>
  );
}

function NewUserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createUser, null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs"
    >
      <h2 className="text-sm font-semibold text-ink">Add a user</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        They sign in with this email and password. Share the password with them —
        they can change it from their own account.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="nu-name" error={state?.fieldErrors?.name}>
          <Input id="nu-name" name="name" autoComplete="off" required />
        </Field>
        <Field label="Email" htmlFor="nu-email" error={state?.fieldErrors?.email}>
          <Input id="nu-email" name="email" type="email" autoComplete="off" required />
        </Field>
        <Field label="Role" htmlFor="nu-role" error={state?.fieldErrors?.role}>
          <Select id="nu-role" name="role" defaultValue="Viewer">
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Temporary password"
          htmlFor="nu-password"
          error={state?.fieldErrors?.password}
          hint="At least 8 characters."
        >
          <Input
            id="nu-password"
            name="password"
            type="text"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </Field>
      </div>

      {state && !state.ok && state.error && (
        <p className="mt-3 text-sm font-medium text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add user"}
        </Button>
      </div>
    </form>
  );
}
