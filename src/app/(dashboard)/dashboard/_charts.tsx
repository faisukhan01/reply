"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type TrendPoint = { date: string; count: number };
type SatPoint = { date: string; avg: number };
type StatusData = { ai: number; human: number; closed: number };

function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const VIOLET = "#8b5cf6";
const EMERALD = "#10b981";
const AMBER = "#f59e0b";

export function ConversationsAreaChart({ data }: { data: TrendPoint[] }) {
  const chartData = React.useMemo(
    () => data.map((d) => ({ ...d, label: shortDate(d.date) })),
    [data]
  );
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={VIOLET} stopOpacity={0.45} />
              <stop offset="95%" stopColor={VIOLET} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: VIOLET, strokeOpacity: 0.3 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 12,
              boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
            }}
            labelStyle={{ color: "var(--muted-foreground)", fontWeight: 500 }}
            formatter={(value: number) => [`${value} convos`, "Conversations"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={VIOLET}
            strokeWidth={2.5}
            fill="url(#convGrad)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonutChart({ data }: { data: StatusData }) {
  const total = data.ai + data.human + data.closed;
  const pieData = [
    { name: "AI resolved", value: data.ai, color: VIOLET },
    { name: "Human", value: data.human, color: EMERALD },
    { name: "Closed", value: data.closed, color: AMBER },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[200px] w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData.length ? pieData : [{ name: "None", value: 1, color: "var(--muted)" }]}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {(pieData.length ? pieData : [{ name: "None", value: 1, color: "var(--muted)" }]).map(
                (entry, i) => (
                  <Cell key={i} fill={entry.color} />
                )
              )}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [`${value} convos`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight">{total}</span>
          <span className="text-[11px] text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        <Legend color={VIOLET} label="AI" value={data.ai} />
        <Legend color={EMERALD} label="Human" value={data.human} />
        <Legend color={AMBER} label="Closed" value={data.closed} />
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/30 py-2">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
