"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/form";
import { ROLES } from "@/lib/constants";
import { setUserRole, setUserActive } from "@/lib/actions/users";
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
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
      {users.map((u) => (
        <UserRow key={u.id} u={u} />
      ))}
    </ul>
  );
}

function UserRow({ u }: { u: UserItem }) {
  const [pending, startTransition] = useTransition();

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 px-4 py-3",
        !u.isActive && "opacity-60",
      )}
    >
      {u.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={u.image}
          alt=""
          referrerPolicy="no-referrer"
          className="size-9 rounded-full"
        />
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
    </li>
  );
}
