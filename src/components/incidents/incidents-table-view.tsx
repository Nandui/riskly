"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Users, UserRound, ListChecks } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  facetedFilter,
  type FacetConfig,
} from "@/components/ui/data-table";
import {
  IncidentStatusBadge,
  IncidentTypeBadge,
  SeverityBadge,
} from "@/components/incidents/incident-badges";
import {
  INCIDENT_STATUSES,
  INCIDENT_SEVERITIES,
  INCIDENT_TYPES,
  SEVERITY_RANK,
} from "@/lib/incidents/constants";
import { formatDateTime } from "@/lib/utils";
import type { IncidentListItem } from "@/lib/incidents/types";

export function IncidentsTableView({
  rows,
  showCenter,
  compact = false,
}: {
  rows: IncidentListItem[];
  showCenter: boolean;
  compact?: boolean;
}) {
  const router = useRouter();

  const columns = useMemo<ColumnDef<IncidentListItem>[]>(() => {
    const cols: ColumnDef<IncidentListItem>[] = [
      {
        accessorKey: "reference",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium text-ink">
            {row.original.reference}
          </span>
        ),
      },
      {
        accessorKey: "severity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
        filterFn: facetedFilter<IncidentListItem>(),
        sortingFn: (a, b) =>
          (SEVERITY_RANK[a.original.severity] ?? 0) -
          (SEVERITY_RANK[b.original.severity] ?? 0),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <IncidentTypeBadge type={row.original.type} />,
        filterFn: facetedFilter<IncidentListItem>(),
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{row.original.location}</p>
            {row.original.locationDetail && (
              <p className="truncate text-xs text-muted-foreground">
                {row.original.locationDetail}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "occurredAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Occurred" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-ink-soft tnum">
            {formatDateTime(row.original.occurredAt)}
          </span>
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

    cols.push(
      {
        id: "people",
        header: "People",
        enableSorting: false,
        cell: ({ row }) => {
          const { injuredCount, witnessCount } = row.original;
          if (!injuredCount && !witnessCount)
            return <span className="text-xs text-faint">—</span>;
          return (
            <div className="flex items-center gap-3 text-xs text-muted-foreground tnum">
              {injuredCount > 0 && (
                <span className="inline-flex items-center gap-1" title="Injured parties">
                  <UserRound className="size-3.5 text-faint" />
                  {injuredCount}
                </span>
              )}
              {witnessCount > 0 && (
                <span className="inline-flex items-center gap-1" title="Witnesses">
                  <Users className="size-3.5 text-faint" />
                  {witnessCount}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const { openActionCount, totalActionCount } = row.original;
          if (totalActionCount === 0)
            return <span className="text-xs text-faint">—</span>;
          return (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground tnum"
              title="Open / total follow-up actions"
            >
              <ListChecks className="size-3.5 text-faint" />
              {openActionCount}/{totalActionCount}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <IncidentStatusBadge status={row.original.status} />,
        filterFn: facetedFilter<IncidentListItem>(),
      },
      {
        id: "chevron",
        header: "",
        enableSorting: false,
        cell: () => <ChevronRight className="size-4 text-faint" />,
      },
    );

    return cols;
  }, [showCenter]);

  const facets: FacetConfig[] = compact
    ? []
    : [
        {
          columnId: "status",
          title: "Status",
          options: INCIDENT_STATUSES.map((s) => ({ label: s.label, value: s.value })),
        },
        {
          columnId: "severity",
          title: "Severity",
          options: INCIDENT_SEVERITIES.map((s) => ({ label: s.label, value: s.value })),
        },
        {
          columnId: "type",
          title: "Type",
          options: INCIDENT_TYPES.map((t) => ({ label: t.label, value: t.value })),
        },
      ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable={!compact}
      searchPlaceholder="Search incidents…"
      facets={facets}
      initialSorting={[{ id: "occurredAt", desc: true }]}
      onRowClick={(r) => router.push(`/incidents/${r.id}`)}
      pageSize={compact ? 6 : 15}
    />
  );
}
