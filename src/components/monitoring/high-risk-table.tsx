"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  facetedFilter,
  type FacetConfig,
} from "@/components/ui/data-table";
import { RiskBadge } from "@/components/ui/risk-badge";
import { CategoryBadge } from "@/components/ui/badge";
import { AssessmentModal } from "@/components/assessments/assessment-modal";
import type { RiskBand } from "@/lib/risk";

export interface HighRiskRow {
  id: string;
  hazard: string;
  category: string;
  score: number;
  band: RiskBand;
  personAtRisk: string | null;
  assessmentId: string;
  reference: string;
  centerName: string;
  subjectTitle: string;
}

export function HighRiskTable({
  rows,
  showCenter,
}: {
  rows: HighRiskRow[];
  showCenter: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const columns: ColumnDef<HighRiskRow>[] = [
    {
      id: "risk",
      accessorFn: (r) => r.score,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Risk" />
      ),
      cell: ({ row }) => (
        <RiskBadge
          score={row.original.score}
          band={row.original.band}
          size="sm"
        />
      ),
    },
    {
      accessorKey: "hazard",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Hazard" />
      ),
      cell: ({ row }) => (
        <span className="block max-w-[24rem] truncate font-medium text-ink">
          {row.original.hazard}
        </span>
      ),
    },
    {
      accessorKey: "subjectTitle",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-ink-soft">
          {row.original.subjectTitle}
        </span>
      ),
    },
    ...(showCenter
      ? [
          {
            id: "centerName",
            accessorKey: "centerName",
            filterFn: facetedFilter<HighRiskRow>(),
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Centre" />
            ),
            cell: ({ row }) => (
              <span className="text-sm text-ink-soft">
                {row.original.centerName}
              </span>
            ),
          } as ColumnDef<HighRiskRow>,
        ]
      : []),
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
      accessorKey: "category",
      filterFn: facetedFilter<HighRiskRow>(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => <CategoryBadge category={row.original.category} />,
    },
    {
      id: "chevron",
      header: () => null,
      cell: () => <ChevronRight className="size-4 text-faint" />,
      enableSorting: false,
    },
  ];

  const categoryOptions = Array.from(new Set(rows.map((r) => r.category)))
    .sort()
    .map((c) => ({ label: c, value: c }));
  const centreOptions = Array.from(new Set(rows.map((r) => r.centerName)))
    .sort()
    .map((c) => ({ label: c, value: c }));

  const facets: FacetConfig[] = [
    { columnId: "category", title: "Category", options: categoryOptions },
    ...(showCenter
      ? [{ columnId: "centerName", title: "Centre", options: centreOptions }]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        searchable
        searchPlaceholder="Search hazards…"
        facets={facets}
        onRowClick={(r) => setOpenId(r.assessmentId)}
        pageSize={15}
        emptyState="No hazards match your filters."
      />
      <AssessmentModal
        id={openId}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      />
    </>
  );
}
