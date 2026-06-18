"use client";

import { useState, useTransition } from "react";
import { KeyRound, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  facetedFilter,
  type FacetConfig,
} from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES } from "@/lib/constants";
import {
  resetUserPassword,
  setUserRole,
  setUserActive,
} from "@/lib/actions/users";

export interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  isActive: boolean;
  isSelf: boolean;
}

function initials(u: { name: string | null; email: string | null }) {
  const base = u.name || u.email || "?";
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UsersTable({ users }: { users: UserItem[] }) {
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [pwd, setPwd] = useState("");

  const changeRole = (u: UserItem, role: string) =>
    startTransition(() => {
      void setUserRole(u.id, role);
    });

  const toggleActive = (u: UserItem) =>
    startTransition(() => {
      void setUserActive(u.id, !u.isActive);
    });

  const closeReset = () => {
    setResetUser(null);
    setPwd("");
  };

  const submitReset = () => {
    if (!resetUser || pwd.length < 8) return;
    startSaving(async () => {
      const res = await resetUserPassword(resetUser.id, pwd);
      if (res?.ok) {
        toast.success("Password updated.");
        closeReset();
      } else {
        toast.error(res?.error ?? "Couldn't update the password.");
      }
    });
  };

  const columns: ColumnDef<UserItem>[] = [
    {
      id: "user",
      accessorFn: (u) => u.name ?? u.email ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8">
              {u.image ? (
                <AvatarImage src={u.image} alt="" referrerPolicy="no-referrer" />
              ) : null}
              <AvatarFallback>{initials(u)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-ink">
              {u.name ?? u.email}
              {u.isSelf && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (you)
                </span>
              )}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "role",
      filterFn: facetedFilter<UserItem>(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <Select
            aria-label="Role"
            value={u.role}
            disabled={u.isSelf || pending}
            onChange={(e) => changeRole(u, e.target.value)}
            className="h-8 w-auto min-w-[8.5rem] text-[0.8125rem]"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        );
      },
    },
    {
      id: "status",
      accessorFn: (u) => (u.isActive ? "Active" : "Inactive"),
      filterFn: facetedFilter<UserItem>(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="border border-low-line bg-low-bg text-low">
            Active
          </Badge>
        ) : (
          <Badge className="border border-slate-200 bg-slate-100 text-slate-500">
            Inactive
          </Badge>
        ),
    },
    {
      id: "actions",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="User actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setPwd("");
                    setResetUser(u);
                  }}
                >
                  <KeyRound /> Reset password
                </DropdownMenuItem>
                {!u.isSelf && (
                  <DropdownMenuItem onSelect={() => toggleActive(u)}>
                    {u.isActive ? (
                      <>
                        <UserX /> Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck /> Activate
                      </>
                    )}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const facets: FacetConfig[] = [
    {
      columnId: "role",
      title: "Role",
      options: ROLES.map((r) => ({ label: r.label, value: r.value })),
    },
    {
      columnId: "status",
      title: "Status",
      options: [
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" },
      ],
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        searchable
        searchPlaceholder="Search name or email…"
        facets={facets}
        pageSize={20}
        emptyState="No users match your filters."
      />

      <Dialog
        open={!!resetUser}
        onOpenChange={(open) => {
          if (!open) closeReset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium text-ink">
                {resetUser?.name ?? resetUser?.email}
              </span>
              . Share it with them — they can change it from their account.
            </DialogDescription>
          </DialogHeader>
          <Field label="New password" htmlFor="reset-pwd" hint="At least 8 characters.">
            <Input
              id="reset-pwd"
              type="text"
              value={pwd}
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              onChange={(e) => setPwd(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={closeReset}>
              Cancel
            </Button>
            <Button onClick={submitReset} disabled={saving || pwd.length < 8}>
              {saving ? "Saving…" : "Save password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
