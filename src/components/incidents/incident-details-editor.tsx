"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { IncidentForm } from "@/components/incidents/incident-form";
import type { AreaOption, IncidentDetail, UserOption } from "@/lib/incidents/types";
import type { CenterSummary } from "@/lib/center-shared";

// Opens the core-details form (centre, type, severity, when, where, narrative,
// immediate action, CCTV reference, reporter) in a dialog — the workspace's
// inline replacement for the retired /edit page.
export function IncidentDetailsEditor({
  incident,
  centers,
  areaOptions,
  isAdmin,
  reporterOptions,
  compact = false,
}: {
  incident: IncidentDetail;
  centers: CenterSummary[];
  areaOptions: AreaOption[];
  isAdmin: boolean;
  reporterOptions: UserOption[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Edit details"
          title="Edit details"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-ink"
        >
          <Pencil className="size-4" />
        </button>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="size-4" /> Edit details
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Edit incident details</DialogTitle>
                <DialogDescription>
                  Correct the core facts and narrative. People, evidence and
                  follow-up actions are managed on the page.
                </DialogDescription>
              </DialogHeader>
              <IncidentForm
                mode="edit"
                centers={centers}
                areaOptions={areaOptions}
                isAdmin={isAdmin}
                reporterOptions={reporterOptions}
                onSaved={() => setOpen(false)}
                defaultValues={{
                  id: incident.id,
                  centerId: incident.centerId,
                  type: incident.type,
                  severity: incident.severity,
                  occurredAt: format(incident.occurredAt, "yyyy-MM-dd'T'HH:mm"),
                  areaId: incident.areaId ?? "",
                  subAreaId: incident.subAreaId ?? "",
                  description: incident.description,
                  immediateAction: incident.immediateAction ?? "",
                  evidenceRef: incident.evidenceRef ?? "",
                  reportedById: incident.reportedById ?? "",
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
