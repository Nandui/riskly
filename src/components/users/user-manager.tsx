"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/constants";
import {
  createUser,
  resetUserPassword,
  setUserRole,
  setUserActive,
} from "@/lib/actions/users";
import { cn } from "@/lib/utils";

export interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  isActive: boolean;
  isSelf: boolean;
}

function initials(u: UserItem) {
  const base = u.name || u.email || "?";
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserManager({ users }: { users: UserItem[] }) {
  return (
    <div className="space-y-4">
      <NewUserForm />
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
        {users.map((u) => (
          <UserRow key={u.id} u={u} />
        ))}
      </ul>
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
      <p className="mt-0.5 text-xs text-muted">
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

function UserRow({ u }: { u: UserItem }) {
  const [pending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const submitReset = () => {
    startTransition(async () => {
      const res = await resetUserPassword(u.id, pwd);
      if (res?.ok) {
        setResetOpen(false);
        setPwd("");
        setNote({ ok: true, text: "Password updated." });
      } else {
        setNote({ ok: false, text: res?.error ?? "Couldn't update the password." });
      }
    });
  };

  return (
    <li className={cn("px-4 py-3", !u.isActive && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-3">
        {u.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.image} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-soft">
            {initials(u)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">
            {u.name ?? u.email}
            {u.isSelf && <span className="text-xs font-normal text-muted"> (you)</span>}
          </p>
          <p className="truncate text-xs text-muted">{u.email}</p>
        </div>

        {!u.isActive && (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
            Inactive
          </span>
        )}

        <Select
          aria-label="Role"
          value={u.role}
          disabled={u.isSelf || pending}
          onChange={(e) =>
            startTransition(() => {
              void setUserRole(u.id, e.target.value);
            })
          }
          className="w-auto min-w-[9rem]"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setNote(null);
            setResetOpen((v) => !v);
          }}
          title="Reset password"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
        >
          <KeyRound className="size-4" /> Reset
        </button>

        <button
          type="button"
          disabled={u.isSelf || pending}
          onClick={() =>
            startTransition(() => {
              void setUserActive(u.id, !u.isActive);
            })
          }
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {u.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>

      {resetOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <Field label="New password" htmlFor={`pw-${u.id}`} className="flex-1 min-w-[12rem]">
            <Input
              id={`pw-${u.id}`}
              type="text"
              value={pwd}
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              onChange={(e) => setPwd(e.target.value)}
            />
          </Field>
          <Button type="button" size="sm" onClick={submitReset} disabled={pending || pwd.length < 8}>
            {pending ? "Saving…" : "Save password"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setResetOpen(false);
              setPwd("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {note && (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            note.ok ? "text-brand-strong" : "text-critical",
          )}
        >
          {note.text}
        </p>
      )}
    </li>
  );
}
