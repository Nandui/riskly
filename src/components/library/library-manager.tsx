"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  MapPin,
  Users,
  Activity,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form";
import type { LibraryEntity } from "@/lib/data/library";
import {
  createArea,
  updateArea,
  deleteArea,
  createRole,
  updateRole,
  deleteRole,
  createActivity,
  updateActivity,
  deleteActivity,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/lib/actions/library";

type CreateAction = (prev: FormState, fd: FormData) => Promise<FormState>;
type UpdateAction = (
  id: string,
  prev: FormState,
  fd: FormData,
) => Promise<FormState>;
type DeleteAction = (id: string) => Promise<FormState>;

const TABS = [
  { key: "areas", label: "Areas", icon: MapPin },
  { key: "roles", label: "Roles", icon: Users },
  { key: "activities", label: "Activities", icon: Activity },
  { key: "departments", label: "Departments", icon: Building2 },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function LibraryManager({
  centers,
  defaultCenterId,
  areasByCenter,
  roles,
  activities,
  departments,
}: {
  centers: { id: string; name: string }[];
  defaultCenterId: string | null;
  areasByCenter: Record<string, LibraryEntity[]>;
  roles: LibraryEntity[];
  activities: LibraryEntity[];
  departments: LibraryEntity[];
}) {
  const [tab, setTab] = useState<TabKey>("areas");
  const [areaCenterId, setAreaCenterId] = useState<string>(
    defaultCenterId ?? centers[0]?.id ?? "",
  );
  const areas = areasByCenter[areaCenterId] ?? [];
  const areaCenterName = centers.find((c) => c.id === areaCenterId)?.name ?? "";
  const counts = {
    areas: areas.length,
    roles: roles.length,
    activities: activities.length,
    departments: departments.length,
  };

  return (
    <div>
      <div className="scrollbar-none inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-surface text-primary shadow-xs"
                  : "text-muted-foreground hover:text-ink",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tnum",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface text-muted-foreground",
                )}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        {tab === "areas" &&
          (centers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line-strong bg-surface/60 p-8 text-center text-sm text-muted-foreground">
              Add a centre first — areas belong to a centre.
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                Areas for centre
                <Select
                  value={areaCenterId}
                  onChange={(e) => setAreaCenterId(e.target.value)}
                  className="w-auto min-w-[12rem]"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </label>
              <EntityPanel
                key={areaCenterId}
                singular="area"
                description={`Physical areas at ${areaCenterName}. Areas are specific to each centre.`}
                items={areas}
                createAction={createArea.bind(null, areaCenterId)}
                updateAction={updateArea}
                deleteAction={deleteArea}
              />
            </div>
          ))}

        {tab === "roles" && (
          <EntityPanel
            singular="role"
            description="Staff roles, shared across all centres."
            items={roles}
            createAction={createRole}
            updateAction={updateRole}
            deleteAction={deleteRole}
          />
        )}

        {tab === "activities" && (
          <EntityPanel
            singular="activity"
            plural="activities"
            description="Activities, shared across all centres."
            items={activities}
            createAction={createActivity}
            updateAction={updateActivity}
            deleteAction={deleteActivity}
          />
        )}

        {tab === "departments" && (
          <EntityPanel
            singular="department"
            description="Departments that own assessments (Ops, Maintenance, Accounts…), shared across all centres."
            items={departments}
            createAction={createDepartment}
            updateAction={updateDepartment}
            deleteAction={deleteDepartment}
          />
        )}
      </div>
    </div>
  );
}

function EntityPanel({
  singular,
  plural,
  description,
  items,
  createAction,
  updateAction,
  deleteAction,
}: {
  singular: string;
  plural?: string;
  description: string;
  items: LibraryEntity[];
  createAction: CreateAction;
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
}) {
  const pluralLabel = plural ?? `${singular}s`;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{description}</p>
      <AddForm singular={singular} action={createAction} />
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted-foreground">
          No {pluralLabel} yet — add one above.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {items.map((it) => (
            <EntityRow
              key={it.id}
              item={it}
              singular={singular}
              updateAction={updateAction}
              deleteAction={deleteAction}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddForm({
  singular,
  action,
}: {
  singular: string;
  action: CreateAction;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface-2/60 p-3 sm:flex-row sm:items-center"
      >
        <Input
          name="name"
          placeholder={`Add ${singular}…`}
          aria-label={`${singular} name`}
          className="flex-1"
        />
        <Input
          name="description"
          placeholder="Description (optional)"
          aria-label="Description"
          className="flex-1"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          <Plus className="size-4" /> Add
        </Button>
      </form>
      {state?.fieldErrors?.name && (
        <p className="mt-1.5 text-xs font-medium text-critical">
          {state.fieldErrors.name}
        </p>
      )}
      {state?.error && (
        <p className="mt-1.5 text-xs font-medium text-critical">{state.error}</p>
      )}
    </div>
  );
}

function EntityRow({
  item,
  singular,
  updateAction,
  deleteAction,
}: {
  item: LibraryEntity;
  singular: string;
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="p-3">
        <EditForm
          item={item}
          action={updateAction.bind(null, item.id)}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{item.name}</p>
        {item.description && (
          <p className="truncate text-sm text-muted-foreground">{item.description}</p>
        )}
      </div>
      <span className="hidden shrink-0 text-xs tnum text-faint sm:inline">
        {item.usageCount} {item.usageCount === 1 ? "use" : "uses"}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${item.name}`}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-ink"
      >
        <Pencil className="size-4" />
      </button>
      <DeleteControl id={item.id} singular={singular} action={deleteAction} />
    </li>
  );
}

function EditForm({
  item,
  action,
  onDone,
}: {
  item: LibraryEntity;
  action: CreateAction;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    null,
  );
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="flex-1">
        <Input name="name" defaultValue={item.name} autoFocus aria-label="Name" />
        {state?.fieldErrors?.name && (
          <p className="mt-1 text-xs font-medium text-critical">
            {state.fieldErrors.name}
          </p>
        )}
      </div>
      <Input
        name="description"
        defaultValue={item.description ?? ""}
        placeholder="Description (optional)"
        aria-label="Description"
        className="flex-1"
      />
      <div className="flex gap-1">
        <Button type="submit" size="icon" disabled={pending} aria-label="Save">
          <Check className="size-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onDone}
          aria-label="Cancel"
        >
          <X className="size-4" />
        </Button>
      </div>
    </form>
  );
}

function DeleteControl({
  id,
  singular,
  action,
}: {
  id: string;
  singular: string;
  action: DeleteAction;
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirm) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await action(id);
              if (r && !r.ok) {
                setError(r.error ?? "Cannot delete.");
                setConfirm(false);
              }
            })
          }
          className="text-xs font-semibold text-critical hover:underline"
        >
          {pending ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="text-xs text-muted-foreground hover:text-ink"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      {error && (
        <span className="max-w-[12rem] text-right text-xs text-critical">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirm(true);
        }}
        aria-label={`Delete ${singular}`}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-critical-bg hover:text-critical"
      >
        <Trash2 className="size-4" />
      </button>
    </span>
  );
}
