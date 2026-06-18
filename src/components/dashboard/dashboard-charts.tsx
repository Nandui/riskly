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

const BAND_COLOR: Record<string, string> = {
  low: "var(--color-low)",
  medium: "var(--color-medium)",
  high: "var(--color-high)",
  veryHigh: "var(--color-critical)",
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
        {value === 1 ? "item" : "items"}
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

export function RiskBandChart({
  data,
}: {
  data: { band: string; label: string; count: number }[];
}) {
  if (data.every((d) => d.count === 0)) {
    return <EmptyChart label="No rated assessments yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={76}
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
            <Cell key={d.band} fill={BAND_COLOR[d.band] ?? "var(--color-primary)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryChart({
  data,
}: {
  data: { category: string; count: number }[];
}) {
  if (!data.length) return <EmptyChart label="No hazards yet" />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="category"
          width={100}
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
  );
}
