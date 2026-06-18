"use client";

import { useRouter } from "next/navigation";
import { MapPin, UserRound, Activity, ChevronRight } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  facetedFilter,
  type FacetConfig,
} from "@/components/ui/data-table";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/badge";
import { ReviewChip } from "@/components/ui/review-chip";
import type { AssessmentRow } from "@/lib/data/assessments";
import { ASSESSMENT_STATUSES } from "@/lib/constants";
import { RISK_BANDS, BAND_META } from "@/lib/risk";
import { cn } from "@/lib/utils";

const SUBJECT_ICON: Record<string, typeof MapPin> = {
  Area: MapPin,
  Role: UserRound,
  Activity,
};

export function AssessmentsTableView({
  rows,
  showCenter,
}: {
  rows: AssessmentRow[];
  showCenter: boolean;
}) {
  const router = useRouter();

  const columns: ColumnDef<AssessmentRow>[] = [
    {
      accessorKey: "reference",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ref" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-faint">
          {row.original.reference}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject" />
      ),
      cell: ({ row }) => {
        const Icon = SUBJECT_ICON[row.original.subjectType] ?? MapPin;
        return (
          <div className="flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-faint" />
            <span className="font-medium text-ink">{row.original.title}</span>
          </div>
        );
      },
    },
    ...(showCenter
      ? [
          {
            id: "center",
            accessorFn: (r: AssessmentRow) => r.center.name,
            filterFn: facetedFilter<AssessmentRow>(),
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Centre" />
            ),
            cell: ({ row }) => (
              <span className="text-sm text-ink-soft">
                {row.original.center.name}
              </span>
            ),
          } as ColumnDef<AssessmentRow>,
        ]
      : []),
    {
      id: "risk",
      accessorFn: (r) => r.summary.overallScore,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Risk" />
      ),
      cell: ({ row }) =>
        row.original.summary.headlineBand ? (
          <RiskBadge
            score={row.original.summary.overallScore}
            band={row.original.summary.headlineBand}
            size="sm"
          />
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      id: "highRisk",
      accessorFn: (r) => r.summary.highRiskCount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="High" />
      ),
      cell: ({ row }) => {
        const n = row.original.summary.highRiskCount;
        return (
          <span
            className={cn(
              "tnum text-sm font-medium",
              n > 0 ? "text-critical" : "text-faint",
            )}
          >
            {n || "—"}
          </span>
        );
      },
    },
    {
      id: "review",
      accessorFn: (r) => r.summary.review.days,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Next review" />
      ),
      cell: ({ row }) => <ReviewChip review={row.original.summary.review} />,
    },
    {
      accessorKey: "status",
      filterFn: facetedFilter<AssessmentRow>(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    // Hidden columns that back the faceted filters.
    {
      id: "band",
      accessorFn: (r) => r.summary.headlineBand ?? "",
      filterFn: facetedFilter<AssessmentRow>(),
      enableSorting: false,
    },
    {
      id: "subjectType",
      accessorKey: "subjectType",
      filterFn: facetedFilter<AssessmentRow>(),
      enableSorting: false,
    },
    {
      id: "chevron",
      header: () => null,
      cell: () => <ChevronRight className="size-4 text-faint" />,
      enableSorting: false,
    },
  ];

  const centreOptions = Array.from(new Set(rows.map((r) => r.center.name)))
    .sort()
    .map((name) => ({ label: name, value: name }));

  const facets: FacetConfig[] = [
    {
      columnId: "status",
      title: "Status",
      options: ASSESSMENT_STATUSES.map((s) => ({
        label: s.label,
        value: s.value,
      })),
    },
    {
      columnId: "band",
      title: "Risk",
      options: RISK_BANDS.map((b) => ({ label: BAND_META[b].label, value: b })),
    },
    {
      columnId: "subjectType",
      title: "Type",
      options: [
        { label: "Area", value: "Area" },
        { label: "Role", value: "Role" },
        { label: "Activity", value: "Activity" },
      ],
    },
    ...(showCenter
      ? [{ columnId: "center", title: "Centre", options: centreOptions }]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable
      searchPlaceholder="Search reference or subject…"
      facets={facets}
      initialColumnVisibility={{ band: false, subjectType: false }}
      onRowClick={(r) => router.push(`/assessments/${r.id}`)}
      pageSize={15}
      emptyState="No assessments match your filters."
    />
  );
}
