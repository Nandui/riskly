"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportIncidentReportToPdf } from "@/lib/incidents/pdf";
import type { IncidentDetail } from "@/lib/incidents/types";

export function ExportIncidentReportButton({
  incident,
}: {
  incident: IncidentDetail;
}) {
  const [pending, startTransition] = useTransition();

  const onExport = () => {
    startTransition(async () => {
      try {
        await exportIncidentReportToPdf(incident);
      } catch {
        toast.error("Could not generate the PDF.");
      }
    });
  };

  return (
    <Button variant="outline" onClick={onExport} disabled={pending}>
      <Download className="size-4" />
      {pending ? "Generating…" : "Export PDF"}
    </Button>
  );
}
