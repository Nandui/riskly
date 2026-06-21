"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  IncidentModuleFields,
  type ModuleDefaults,
} from "@/components/incidents/incident-module-fields";
import { updateIncidentModules } from "@/lib/actions/incidents";
import type { FormState } from "@/lib/form";

// Edit the captured type-specific detail in place (the fields are otherwise
// only set at capture). Reuses the same IncidentModuleFields used at intake,
// prefilled from the incident.
export function IncidentModuleEditor({
  incidentId,
  type,
  defaults,
  areas,
  label = "Edit",
}: {
  incidentId: string;
  type: string;
  defaults: ModuleDefaults;
  areas: { id: string; name: string }[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          {open && (
            <ModuleForm
              incidentId={incidentId}
              type={type}
              defaults={defaults}
              areas={areas}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModuleForm({
  incidentId,
  type,
  defaults,
  areas,
  onDone,
}: {
  incidentId: string;
  type: string;
  defaults: ModuleDefaults;
  areas: { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateIncidentModules,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Details updated.");
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit type-specific details</DialogTitle>
        <DialogDescription>
          The structured detail captured for this incident type. Leave a field
          blank to clear it.
        </DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="incidentId" value={incidentId} />

        {state && !state.ok && state.error && (
          <p className="rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
            {state.error}
          </p>
        )}

        <IncidentModuleFields type={type} areas={areas} defaults={defaults} />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
