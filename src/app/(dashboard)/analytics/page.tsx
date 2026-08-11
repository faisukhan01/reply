"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Star,
  MessageSquare,
  Clock,
  Loader2,
  Sparkles,
  Download,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnalyticsData = {
  totalConversations?: number;
  aiHandled?: number;
  humanHandled?: number;
  resolutionRate?: number;
  avgSatisfaction?: number;
  totalContacts?: number;
  totalMessages?: number;
  conversationsTrend?: { date: string; count?: number; value?: number }[];
  satisfactionTrend?: { date: string; score?: number; value?: number }[];
  statusBreakdown?: { ai?: number; human?: number; closed?: number };
  topQuestions?: { question?: string; q?: string; count?: number }[];
};

const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "14d", label: "14 days" },
  { id: "30d", label: "30 days" },
] as const;

function fmtDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              accent
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-3" />
        ) : (
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
        )}
        {sub && !loading && (
          <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("14d");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics?range=${range}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Request failed (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : "Failed to load analytics";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const conversationsTrend = useMemo(() => {
    const arr = data?.conversationsTrend ?? [];
    return arr.map((d) => ({
      date: fmtDay(d.date),
      count: Number(d.count ?? d.value ?? 0),
    }));
  }, [data]);

  const satisfactionTrend = useMemo(() => {
    const arr = data?.satisfactionTrend ?? [];
    return arr.map((d) => ({
      date: fmtDay(d.date),
      score: Number(d.score ?? d.value ?? 0),
    }));
  }, [data]);

  const statusData = useMemo(() => {
    const sb = data?.statusBreakdown ?? {};
    return [
      { name: "AI handled", value: Number(sb.ai ?? 0), color: "#8b5cf6" },
      { name: "Human", value: Number(sb.human ?? 0), color: "#d946ef" },
      { name: "Closed", value: Number(sb.closed ?? 0), color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const topQuestions = useMemo(() => {
    const arr = data?.topQuestions ?? [];
    return arr
      .map((q) => ({
        question: q.question ?? q.q ?? "Unknown",
        count: Number(q.count ?? 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data]);

  const maxQ = useMemo(
    () => Math.max(1, ...topQuestions.map((q) => q.count)),
    [topQuestions]
  );

  const resolutionRate = data?.resolutionRate ?? 0;
  const avgSatisfaction = data?.avgSatisfaction ?? 0;
  const totalMessages = data?.totalMessages ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Track AI performance, satisfaction, and conversation volume.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={range === r.id ? "default" : "ghost"}
              className={cn(
                "h-7 text-xs",
                range === r.id && "shadow-sm"
              )}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </Button>
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={() => { const csv = "Metric,Value\nResolution Rate," + resolutionRate.toFixed(1) + "%\nAvg Satisfaction," + avgSatisfaction.toFixed(1) + "\nTotal Messages," + totalMessages; const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "analytics-export.csv"; a.click(); URL.revokeObjectURL(url); }}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </motion.div>

      {error && !loading && (
        <Card className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
          <CardContent className="p-4 flex items-center gap-3 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              !
            </span>
            <div>
              <div className="font-medium">Couldn&apos;t load live analytics</div>
              <div className="text-muted-foreground text-xs">{error}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Resolution rate"
          value={`${resolutionRate.toFixed(1)}%`}
          sub="AI resolved without human"
          accent="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          loading={loading}
        />
        <KpiCard
          icon={Star}
          label="Avg satisfaction"
          value={avgSatisfaction.toFixed(1)}
          sub="out of 5.0 rating"
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          loading={loading}
        />
        <KpiCard
          icon={MessageSquare}
          label="Total messages"
          value={totalMessages.toLocaleString()}
          sub={`${(data?.totalConversations ?? 0).toLocaleString()} conversations`}
          accent="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
          loading={loading}
        />
        <KpiCard
          icon={Clock}
          label="Avg response time"
          value="1.8s"
          sub="AI first response (demo)"
          accent="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          loading={false}
        />
      </motion.div>

      {/* Charts row 1 */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid gap-4 lg:grid-cols-3">
        {/* Conversations over time */}
        <Card className="rounded-xl border shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Conversations over time</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Daily volume for the selected range
              </p>
            </div>
            <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
              {data?.totalConversations ?? 0} total
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px] w-full">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={conversationsTrend}
                    margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={12}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status distribution donut */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status distribution</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              AI vs human vs closed
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[200px] w-full">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : statusData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-1.5 mt-2">
              {statusData.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: s.color }}
                    />
                    {s.name}
                  </span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts row 2 */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="grid gap-4 lg:grid-cols-3">
        {/* Satisfaction trend */}
        <Card className="rounded-xl border shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Satisfaction trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Last 7 days, avg rating per day
              </p>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Star className="h-3 w-3" />
              {avgSatisfaction.toFixed(1)} avg
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[240px] w-full">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={satisfactionTrend}
                    margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 5]}
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--popover-foreground)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: "#10b981",
                        strokeWidth: 0,
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Channel breakdown (static demo) */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Channel breakdown</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Where conversations start
            </p>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            <ChannelRow
              label="Website widget"
              value={92}
              color="bg-violet-500"
              display="92%"
            />
            <ChannelRow
              label="Email"
              value={6}
              color="bg-fuchsia-500"
              display="6%"
            />
            <ChannelRow
              label="Other"
              value={2}
              color="bg-amber-500"
              display="2%"
            />
            <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Demo distribution — connect more channels in settings.
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top questions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top questions</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Most asked by your visitors
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : topQuestions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No questions logged yet.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {topQuestions.map((q, idx) => (
                <li key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate pr-3">
                      {q.question}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {q.count}
                    </Badge>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{ width: `${(q.count / maxQ) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Loading overlay for refetch */}
      {loading && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-3 py-1.5 text-xs shadow-md">
          <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
          Refreshing…
        </div>
      )}
    </div>
  );
}

function ChannelRow({
  label,
  value,
  color,
  display,
}: {
  label: string;
  value: number;
  color: string;
  display: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{display}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
