"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  facetedFilter,
  type FacetConfig,
} from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ActionStatusBadge } from "@/components/incidents/incident-badges";
import { ACTION_STATUSES } from "@/lib/incidents/constants";
import { setActionStatus } from "@/lib/actions/incidents";
import { formatDate } from "@/lib/utils";
import type { ActionListItem } from "@/lib/incidents/types";

function MarkCompleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        startTransition(async () => {
          const res = await setActionStatus(id, "Complete");
          if (res && !res.ok) {
            toast.error(res.error ?? "Could not update the action.");
            return;
          }
          toast.success("Action marked complete.");
          router.refresh();
        });
      }}
    >
      <Check className="size-4" />
      {pending ? "Saving…" : "Mark complete"}
    </Button>
  );
}

export function ActionsOverviewTable({
  rows,
  showCenter,
  canManage,
}: {
  rows: ActionListItem[];
  showCenter: boolean;
  canManage: boolean;
}) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<ActionListItem>[]>(() => {
    const cols: ColumnDef<ActionListItem>[] = [
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => <ActionStatusBadge status={row.original.status} />,
        filterFn: facetedFilter<ActionListItem>(),
      },
      {
        accessorKey: "description",
        header: "Action",
        cell: ({ row }) => (
          <p className="max-w-[22rem] truncate text-sm text-ink">
            {row.original.description}
          </p>
        ),
      },
      {
        accessorKey: "assignedTo",
        header: "Assigned to",
        cell: ({ row }) => (
          <span className="text-sm text-ink-soft">{row.original.assignedTo}</span>
        ),
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Due" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-ink-soft tnum">
            {formatDate(row.original.dueDate)}
          </span>
        ),
      },
      {
        id: "incident",
        accessorFn: (r) => r.incidentRef,
        header: "Incident",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium text-ink">
              {row.original.incidentRef}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.incidentLocation}
            </p>
          </div>
        ),
      },
    ];

    if (showCenter) {
      cols.push({
        id: "center",
        accessorFn: (r) => r.centerName,
        header: "Centre",
        cell: ({ row }) => (
          <span className="text-sm text-ink-soft">{row.original.centerName}</span>
        ),
      });
    }

    if (canManage) {
      cols.push({
        id: "complete",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "Complete" ? null : (
            <div className="flex justify-end">
              <MarkCompleteButton id={row.original.id} />
            </div>
          ),
      });
    }

    return cols;
  }, [showCenter, canManage]);

  const facets: FacetConfig[] = [
    {
      columnId: "status",
      title: "Status",
      options: ACTION_STATUSES.map((s) => ({ label: s.label, value: s.value })),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable
      searchPlaceholder="Search actions…"
      facets={facets}
      initialSorting={[{ id: "dueDate", desc: false }]}
      onRowClick={(r) => router.push(`/incidents/${r.incidentId}`)}
      emptyState="No follow-up actions"
    />
  );
}
