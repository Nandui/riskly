"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type Column,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  PlusCircle,
  Check,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

// Faceted filter factory: keep a row when its value is in the selected set.
// A factory so each column gets a FilterFn typed to its own row shape.
export function facetedFilter<TData>(): FilterFn<TData> {
  return (row, columnId, value) => {
    const selected = value as string[] | undefined;
    if (!selected?.length) return true;
    return selected.includes(String(row.getValue(columnId)));
  };
}

export interface FacetConfig {
  columnId: string;
  title: string;
  options: { label: string; value: string }[];
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchable?: boolean;
  searchPlaceholder?: string;
  facets?: FacetConfig[];
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  emptyState?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = "Search…",
  facets = [],
  initialSorting = [],
  initialColumnVisibility = {},
  onRowClick,
  pageSize = 15,
  emptyState,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: { pagination: { pageSize } },
  });

  const isFiltered =
    columnFilters.length > 0 || globalFilter.trim().length > 0;
  const totalRows = table.getFilteredRowModel().rows.length;
  const showToolbar = searchable || facets.length > 0;

  return (
    <div className="space-y-3">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative min-w-[14rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
                aria-label="Search"
              />
            </div>
          )}
          {facets.map((facet) => {
            const column = table.getColumn(facet.columnId);
            if (!column) return null;
            return (
              <DataTableFacetedFilter
                key={facet.columnId}
                column={column}
                title={facet.title}
                options={facet.options}
              />
            );
          })}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                table.resetColumnFilters();
                setGlobalFilter("");
              }}
            >
              <X className="size-4" /> Clear
            </Button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
        <Table>
          <TableHeader className="bg-surface-2/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-28 whitespace-normal text-center text-sm text-muted-foreground"
                >
                  {emptyState ?? "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalRows > pageSize && <DataTablePagination table={table} />}
    </div>
  );
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <span className={cn("text-xs", className)}>{title}</span>;
  }
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {title}
      {sorted === "asc" ? (
        <ChevronUp className="size-3.5" />
      ) : sorted === "desc" ? (
        <ChevronDown className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-40" />
      )}
    </button>
  );
}

function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: {
  column: Column<TData, TValue>;
  title: string;
  options: { label: string; value: string }[];
}) {
  const selected = new Set((column.getFilterValue() as string[]) ?? []);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    column.setFilterValue(next.size ? Array.from(next) : undefined);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="size-4" />
          {title}
          {selected.size > 0 && (
            <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-[0.7rem] font-medium text-accent-foreground tnum">
              {selected.size}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        {options.map((option) => {
          const isSelected = selected.has(option.value);
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={isSelected}
              onCheckedChange={() => toggle(option.value)}
              onSelect={(e) => e.preventDefault()}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => column.setFilterValue(undefined)}
              className="justify-center text-muted-foreground"
            >
              Clear filter
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DataTablePagination<TData>({
  table,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
}) {
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <p className="text-xs text-muted-foreground tnum">
        {table.getFilteredRowModel().rows.length} row
        {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground tnum">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          aria-label="Last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
