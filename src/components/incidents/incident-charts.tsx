"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DistributionItem } from "@/lib/incidents/types";

// Colour each severity bar with the risk palette (semantic — same hues the rest
// of Riskly uses for risk bands and incident severity pills).
const SEVERITY_COLOR: Record<string, string> = {
  Minor: "var(--color-low)",
  Significant: "var(--color-medium)",
  Reportable: "var(--color-high)",
  Critical: "var(--color-critical)",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.value;
  const value = typeof raw === "number" ? raw : Number(raw ?? 0);
  return (
    <div className="rounded-lg border border-line bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-ink">{label}</p>
      <p className="text-muted-foreground">
        <span className="tnum font-semibold text-ink">{value}</span>{" "}
        {value === 1 ? "incident" : "incidents"}
      </p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-faint">
      {label}
    </div>
  );
}

const axisTick = { fontSize: 12, fill: "var(--color-ink-soft)" } as const;

// A visually-hidden data table so the chart isn't the only way to read the data.
function ChartDataTable({
  caption,
  columnLabel,
  rows,
}: {
  caption: string;
  columnLabel: string;
  rows: { label: string; count: number }[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{columnLabel}</th>
          <th scope="col">Incidents</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td>{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function IncidentActivityChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  if (data.every((d) => d.count === 0)) {
    return <EmptyChart label="No incidents in range" />;
  }
  return (
    <>
      <ChartDataTable
        caption="Incidents per month"
        columnLabel="Month"
        rows={data.map((d) => ({ label: d.month, count: d.count }))}
      />
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
          >
            <YAxis type="number" hide allowDecimals={false} />
            <XAxis
              type="category"
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-2)" }}
              content={<ChartTooltip />}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              barSize={20}
              fill="var(--color-primary)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function IncidentTypeChart({ data }: { data: DistributionItem[] }) {
  if (!data.length || data.every((d) => d.count === 0)) {
    return <EmptyChart label="No incidents yet" />;
  }
  return (
    <>
      <ChartDataTable
        caption="Incidents by type"
        columnLabel="Type"
        rows={data.map((d) => ({ label: d.label, count: d.count }))}
      />
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-2)" }}
              content={<ChartTooltip />}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              barSize={20}
              fill="var(--color-primary)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function IncidentSeverityChart({ data }: { data: DistributionItem[] }) {
  if (!data.length || data.every((d) => d.count === 0)) {
    return <EmptyChart label="No incidents yet" />;
  }
  return (
    <>
      <ChartDataTable
        caption="Incidents by severity"
        columnLabel="Severity"
        rows={data.map((d) => ({ label: d.label, count: d.count }))}
      />
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-2)" }}
              content={<ChartTooltip />}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((d) => (
                <Cell
                  key={d.value}
                  fill={SEVERITY_COLOR[d.value] ?? "var(--color-primary)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
