"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form";
import type { AdminAreaLocation } from "@/lib/data/incidents";
import {
  createSubArea,
  updateSubArea,
  deleteSubArea,
} from "@/lib/actions/incident-areas";

type SubArea = AdminAreaLocation["subAreas"][number];

export function LocationsManager({
  centers,
  defaultCenterId,
  areasByCenter,
}: {
  centers: { id: string; name: string }[];
  defaultCenterId: string | null;
  areasByCenter: Record<string, AdminAreaLocation[]>;
}) {
  const [centerId, setCenterId] = useState<string>(
    defaultCenterId ?? centers[0]?.id ?? "",
  );
  const areas = areasByCenter[centerId] ?? [];

  if (centers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-surface/60 p-8 text-center text-sm text-muted-foreground">
        Add a centre first — locations belong to a centre.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Locations for centre
        <Select
          value={centerId}
          onChange={(e) => setCenterId(e.target.value)}
          className="w-auto min-w-[12rem]"
        >
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>

      {areas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted-foreground">
          Add areas in the Library tab first.
        </p>
      ) : (
        <div className="space-y-4">
          {areas.map((area) => (
            <AreaPanel key={area.id} area={area} />
          ))}
        </div>
      )}
    </div>
  );
}

function AreaPanel({ area }: { area: AdminAreaLocation }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-3.5">
        <h3 className="text-sm font-semibold text-ink">{area.name}</h3>
        <p className="text-xs text-muted-foreground">
          {area.subAreas.length} sub-location
          {area.subAreas.length === 1 ? "" : "s"}
        </p>
      </div>

      {area.subAreas.length > 0 && (
        <ul className="divide-y divide-line">
          {area.subAreas.map((sub) => (
            <SubAreaRow key={sub.id} sub={sub} />
          ))}
        </ul>
      )}

      <div className="border-t border-line p-3">
        <AddForm areaId={area.id} />
      </div>
    </Card>
  );
}

function AddForm({ areaId }: { areaId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createSubArea.bind(null, areaId),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-surface-2/60 p-3 sm:flex-row sm:items-center"
      >
        <Input
          name="name"
          placeholder="Add sub-location…"
          aria-label="Sub-location name"
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

function SubAreaRow({ sub }: { sub: SubArea }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="p-3">
        <EditForm sub={sub} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{sub.name}</p>
        {sub.description && (
          <p className="truncate text-sm text-muted-foreground">
            {sub.description}
          </p>
        )}
      </div>
      <span className="hidden shrink-0 text-xs tnum text-faint sm:inline">
        {sub.incidentCount} incident{sub.incidentCount === 1 ? "" : "s"}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${sub.name}`}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-ink"
      >
        <Pencil className="size-4" />
      </button>
      <DeleteControl id={sub.id} name={sub.name} />
    </li>
  );
}

function EditForm({ sub, onDone }: { sub: SubArea; onDone: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateSubArea.bind(null, sub.id),
    null,
  );
  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="flex-1">
        <Input name="name" defaultValue={sub.name} autoFocus aria-label="Name" />
        {state?.fieldErrors?.name && (
          <p className="mt-1 text-xs font-medium text-critical">
            {state.fieldErrors.name}
          </p>
        )}
      </div>
      <Input
        name="description"
        defaultValue={sub.description ?? ""}
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

function DeleteControl({ id, name }: { id: string; name: string }) {
  const router = useRouter();
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
              const r = await deleteSubArea(id);
              if (r && !r.ok) {
                setError(r.error ?? "Cannot delete.");
                toast.error(r.error ?? "Cannot delete.");
                setConfirm(false);
                return;
              }
              toast.success("Sub-location deleted.");
              router.refresh();
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
        aria-label={`Delete ${name}`}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-critical-bg hover:text-critical"
      >
        <Trash2 className="size-4" />
      </button>
    </span>
  );
}
