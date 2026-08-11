"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  Clock,
  Loader2,
  Sparkles,
  Download,
  Calendar as CalendarIcon,
  Activity,
  Target,
  Printer,
  Globe,
  Code,
  RefreshCw,
  Minus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AnalyticsData = {
  totalConversations?: number;
  aiHandled?: number;
  humanHandled?: number;
  resolutionRate?: number;
  avgSatisfaction?: number;
  totalContacts?: number;
  totalMessages?: number;
  avgResponseTime?: number;
  peakHour?: number;
  conversationsTrend?: { date: string; count?: number }[];
  satisfactionTrend?: { date: string; avg?: number; score?: number; value?: number }[];
  hourlyActivity?: { hour: number; count: number }[];
  responseTimeDist?: { range: string; count: number }[];
  channelBreakdown?: { widget?: number; api?: number; other?: number };
  statusBreakdown?: { ai?: number; human?: number; closed?: number };
  topQuestions?: { question?: string; q?: string; count?: number }[];
  prev?: {
    resolutionRate?: number;
    avgSatisfaction?: number;
    totalMessages?: number;
    avgResponseTime?: number;
    totalConversations?: number;
  };
};

// ─── Date-range presets ────────────────────────────────────────────
type RangePresetId = "7d" | "30d" | "90d" | "all" | "custom";
const PRESETS: { id: RangePresetId; label: string; days: number | null }[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

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

function fmtHour(h: number) {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

function fmtResponseTime(sec: number) {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function fmtPeakHour(h: number | undefined) {
  if (h == null || h < 0) return "—";
  return fmtHour(h);
}

// ─── Trend pill (small up/down indicator) ──────────────────────────
function TrendPill({
  current,
  prev,
  invert = false,
  suffix = "%",
}: {
  current: number;
  prev: number;
  invert?: boolean;
  suffix?: string;
}) {
  if (!prev || prev === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No prior data
      </span>
    );
  }
  const delta = ((current - prev) / prev) * 100;
  const isUp = delta > 0;
  const isFlat = Math.abs(delta) < 0.5;
  // For "lower is better" metrics (e.g. response time), up = bad
  const good = invert ? !isUp : isUp;
  if (isFlat) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        Flat
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
      )}
    >
      {isUp ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(delta).toFixed(0)}
      {suffix}
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  glow,
  loading,
  trend,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  glow: string; // CSS color for hover sheen
  loading: boolean;
  trend?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "print-card rounded-xl border shadow-sm transition-all duration-300 group overflow-hidden relative",
        "hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      {/* Hover gradient sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(140% 100% at 0% 0%, ${glow} 0%, transparent 55%)`,
        }}
      />
      <CardContent className="relative p-5">
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
        <div className="mt-1 flex items-center justify-between">
          {sub && !loading ? (
            <div className="text-xs text-muted-foreground">{sub}</div>
          ) : (
            <div />
          )}
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  iconAccent,
  badge,
  children,
  className,
  delay,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconAccent: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(className)}
    >
      <Card className="print-card rounded-xl border shadow-sm h-full">
        <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                iconAccent
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          {badge}
        </CardHeader>
        <CardContent className="pt-2">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Date-range picker state
  const [preset, setPreset] = useState<RangePresetId>("30d");
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }));
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics`, { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Request failed (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setLastUpdated(new Date());
        }
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
  }, []);

  // ─── Apply preset → range ────────────────────────────────────────
  function applyPreset(id: RangePresetId) {
    setPreset(id);
    if (id === "all") {
      // "All time" = full 90-day window the API returns
      setRange({ from: subDays(new Date(), 89), to: new Date() });
    } else {
      const days = PRESETS.find((p) => p.id === id)?.days;
      if (days) setRange({ from: subDays(new Date(), days - 1), to: new Date() });
    }
    setDateOpen(false);
  }

  function handleRangeSelect(r: DateRange | undefined) {
    setRange(r);
    setPreset(r?.from && r?.to ? "custom" : preset);
  }

  // ─── Filter trends by selected date range (client-side) ─────────
  const filteredConvTrend = useMemo(() => {
    const arr = data?.conversationsTrend ?? [];
    if (!range?.from) return arr.map((d) => ({ date: fmtDay(d.date), count: Number(d.count ?? 0) }));
    const fromTs = range.from.getTime();
    const toTs = range.to ? range.to.getTime() : Date.now();
    return arr
      .filter((d) => {
        const t = new Date(d.date).getTime();
        return t >= fromTs && t <= toTs + 24 * 60 * 60 * 1000;
      })
      .map((d) => ({ date: fmtDay(d.date), count: Number(d.count ?? 0) }));
  }, [data, range]);

  const filteredSatTrend = useMemo(() => {
    const arr = data?.satisfactionTrend ?? [];
    if (!range?.from) return arr.map((d) => ({ date: fmtDay(d.date), score: Number(d.avg ?? d.score ?? d.value ?? 0) }));
    const fromTs = range.from.getTime();
    const toTs = range.to ? range.to.getTime() : Date.now();
    return arr
      .filter((d) => {
        const t = new Date(d.date).getTime();
        return t >= fromTs && t <= toTs + 24 * 60 * 60 * 1000;
      })
      .map((d) => ({ date: fmtDay(d.date), score: Number(d.avg ?? d.score ?? d.value ?? 0) }));
  }, [data, range]);

  const statusData = useMemo(() => {
    const sb = data?.statusBreakdown ?? {};
    return [
      { name: "AI handled", value: Number(sb.ai ?? 0), color: "#8b5cf6" },
      { name: "Human", value: Number(sb.human ?? 0), color: "#d946ef" },
      { name: "Closed", value: Number(sb.closed ?? 0), color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const channelData = useMemo(() => {
    const cb = data?.channelBreakdown ?? {};
    return [
      { name: "Widget", value: Number(cb.widget ?? 0), color: "#8b5cf6" },
      { name: "API", value: Number(cb.api ?? 0), color: "#d946ef" },
      { name: "Other", value: Number(cb.other ?? 0), color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const hourlyData = useMemo(() => {
    return (data?.hourlyActivity ?? []).map((h) => ({
      hour: fmtHour(h.hour),
      count: h.count,
      raw: h.hour,
    }));
  }, [data]);

  const peakHourValue = data?.peakHour ?? -1;
  const peakCount = useMemo(() => {
    if (peakHourValue < 0) return 0;
    return (data?.hourlyActivity ?? []).find((h) => h.hour === peakHourValue)?.count ?? 0;
  }, [data, peakHourValue]);

  const responseTimeDist = data?.responseTimeDist ?? [];
  const maxRtd = useMemo(
    () => Math.max(1, ...responseTimeDist.map((r) => r.count)),
    [responseTimeDist]
  );

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

  // ─── KPI values ──────────────────────────────────────────────────
  const resolutionRate = data?.resolutionRate ?? 0;
  const avgSatisfaction = data?.avgSatisfaction ?? 0;
  const totalMessages = data?.totalMessages ?? 0;
  const totalConversations = data?.totalConversations ?? 0;
  const avgResponseTime = data?.avgResponseTime ?? 0;
  const aiHandled = data?.aiHandled ?? 0;
  const totalContacts = data?.totalContacts ?? 0;
  const prev = data?.prev ?? {};

  // ─── Range label for badge ──────────────────────────────────────
  const rangeLabel = useMemo(() => {
    if (preset === "all") return "All time (90d)";
    if (preset === "custom" && range?.from && range?.to) {
      return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    }
    const presetLabel = PRESETS.find((p) => p.id === preset)?.label;
    return presetLabel ?? "Custom range";
  }, [preset, range]);

  // ─── CSV export ─────────────────────────────────────────────────
  function exportCsv() {
    const rows: string[] = [];
    rows.push("Section,Metric,Value");
    rows.push(`Summary,Resolution Rate,${resolutionRate}%`);
    rows.push(`Summary,Avg Satisfaction,${avgSatisfaction}`);
    rows.push(`Summary,Total Messages,${totalMessages}`);
    rows.push(`Summary,Total Conversations,${totalConversations}`);
    rows.push(`Summary,Avg Response Time (s),${avgResponseTime}`);
    rows.push(`Summary,Peak Hour,${fmtHour(peakHourValue)}`);
    rows.push(`Summary,AI Handled,${aiHandled}`);
    rows.push(`Summary,Total Contacts,${totalContacts}`);
    rows.push("");
    rows.push("Conversations Trend");
    rows.push("Date,Count");
    filteredConvTrend.forEach((d) => rows.push(`${d.date},${d.count}`));
    rows.push("");
    rows.push("Satisfaction Trend");
    rows.push("Date,Avg Score");
    filteredSatTrend.forEach((d) => rows.push(`${d.date},${d.score}`));
    rows.push("");
    rows.push("Hourly Activity");
    rows.push("Hour,Count");
    (data?.hourlyActivity ?? []).forEach((h) =>
      rows.push(`${fmtHour(h.hour)},${h.count}`)
    );
    rows.push("");
    rows.push("Response Time Distribution");
    rows.push("Range,Count");
    responseTimeDist.forEach((r) => rows.push(`${r.range},${r.count}`));
    rows.push("");
    rows.push("Top Questions");
    rows.push("Question,Count");
    topQuestions.forEach((q) =>
      rows.push(`"${q.question.replace(/"/g, '""')}",${q.count}`)
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Stagger config ─────────────────────────────────────────────
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: 0.05 * i, ease: "easeOut" as const },
  });

  return (
    <div className="print-area space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
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

        <div className="no-print flex flex-wrap items-center gap-2">
          {/* Date range picker */}
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-lg bg-card"
              >
                <CalendarIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-xs">{rangeLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-auto p-0 flex flex-col sm:flex-row gap-2"
            >
              {/* Presets sidebar */}
              <div className="flex flex-col gap-1 p-2 border-b sm:border-b-0 sm:border-r min-w-[140px]">
                <p className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide">
                  Quick select
                </p>
                {PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    variant={preset === p.id ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start h-8 text-xs"
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              {/* Calendar */}
              <div className="p-2">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={handleRangeSelect}
                  numberOfMonths={1}
                  disabled={{ after: new Date() }}
                />
                <div className="flex items-center justify-between px-2 pb-1 pt-2">
                  <span className="text-xs text-muted-foreground">
                    {range?.from
                      ? format(range.from, "MMM d, yyyy")
                      : "Pick start"}
                    {" – "}
                    {range?.to ? format(range.to, "MMM d, yyyy") : "…"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setDateOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Selected range badge */}
          <Badge
            variant="secondary"
            className="hidden md:inline-flex bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 h-9 px-3"
          >
            <CalendarIcon className="h-3 w-3" />
            {rangeLabel}
          </Badge>

          <div className="h-9 w-px bg-border" />

          {/* Export CSV */}
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-lg bg-card"
            onClick={exportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>

          {/* Export PDF (print) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-lg bg-card"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" />
                PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print to PDF (opens browser print dialog)</TooltipContent>
          </Tooltip>

          {/* Last updated */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-1.5 rounded-lg text-muted-foreground"
                onClick={() => {
                  setLoading(true);
                  fetch(`/api/analytics`, { cache: "no-store" })
                    .then((r) => r.json())
                    .then((j) => {
                      setData(j);
                      setLastUpdated(new Date());
                    })
                    .catch(() => {})
                    .finally(() => setLoading(false));
                }}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                <span className="text-xs">Updated {format(lastUpdated, "HH:mm")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Last updated: {format(lastUpdated, "MMM d, yyyy HH:mm:ss")}
              <br />
              Click to refresh
            </TooltipContent>
          </Tooltip>
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

      {/* ─── KPI row (4 main metric cards w/ trend indicators) ────── */}
      <motion.div
        {...stagger(0)}
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          icon={Clock}
          label="Avg Response Time"
          value={fmtResponseTime(avgResponseTime)}
          sub="AI first reply"
          accent="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          glow="rgba(245, 158, 11, 0.10)"
          loading={loading}
          trend={
            !loading ? (
              <TrendPill
                current={avgResponseTime}
                prev={prev.avgResponseTime ?? 0}
                invert
                suffix="%"
              />
            ) : null
          }
        />
        <KpiCard
          icon={Activity}
          label="Peak Hour"
          value={fmtPeakHour(peakHourValue)}
          sub={`${peakCount} conversations`}
          accent="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          glow="rgba(139, 92, 246, 0.12)"
          loading={loading}
          trend={
            !loading ? (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Busiest hour
              </span>
            ) : null
          }
        />
        <KpiCard
          icon={Target}
          label="Resolution Rate"
          value={`${resolutionRate.toFixed(1)}%`}
          sub="AI resolved, no human"
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          glow="rgba(16, 185, 129, 0.12)"
          loading={loading}
          trend={
            !loading ? (
              <TrendPill
                current={resolutionRate}
                prev={prev.resolutionRate ?? 0}
                suffix="%"
              />
            ) : null
          }
        />
        <KpiCard
          icon={MessageSquare}
          label="Total Messages Sent"
          value={totalMessages.toLocaleString()}
          sub={`${totalConversations.toLocaleString()} conversations`}
          accent="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
          glow="rgba(217, 70, 239, 0.12)"
          loading={loading}
          trend={
            !loading ? (
              <TrendPill
                current={totalMessages}
                prev={prev.totalMessages ?? 0}
                suffix="%"
              />
            ) : null
          }
        />
      </motion.div>

      {/* ─── Secondary metrics row (4 more cards) ─────────────────── */}
      <motion.div
        {...stagger(1)}
        className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          icon={Star}
          label="Avg Satisfaction"
          value={avgSatisfaction.toFixed(1)}
          sub="out of 5.0 rating"
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          glow="rgba(16, 185, 129, 0.12)"
          loading={loading}
          trend={
            !loading ? (
              <TrendPill
                current={avgSatisfaction}
                prev={prev.avgSatisfaction ?? 0}
                suffix="%"
              />
            ) : null
          }
        />
        <KpiCard
          icon={BarChart3}
          label="Conversations"
          value={totalConversations.toLocaleString()}
          sub={`${aiHandled.toLocaleString()} AI-handled`}
          accent="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          glow="rgba(139, 92, 246, 0.12)"
          loading={loading}
          trend={
            !loading ? (
              <TrendPill
                current={totalConversations}
                prev={prev.totalConversations ?? 0}
                suffix="%"
              />
            ) : null
          }
        />
        <KpiCard
          icon={MessageSquare}
          label="AI Handled"
          value={aiHandled.toLocaleString()}
          sub={`${totalConversations > 0 ? ((aiHandled / totalConversations) * 100).toFixed(0) : 0}% of total`}
          accent="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
          glow="rgba(217, 70, 239, 0.12)"
          loading={loading}
        />
        <KpiCard
          icon={Target}
          label="Contacts"
          value={totalContacts.toLocaleString()}
          sub="Leads captured"
          accent="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          glow="rgba(245, 158, 11, 0.10)"
          loading={loading}
        />
      </motion.div>

      {/* ─── Chart row 1: Conversations over time + Status donut ──── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Conversations over time"
          description={`Daily volume — ${rangeLabel}`}
          icon={BarChart3}
          iconAccent="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          delay={0.1}
          className="lg:col-span-2"
          badge={
            <Badge
              variant="secondary"
              className="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
            >
              {filteredConvTrend.reduce((s, d) => s + d.count, 0)} total
            </Badge>
          }
        >
          <div className="h-[280px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredConvTrend}
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
                  <RTooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Status distribution"
          description="AI vs human vs closed"
          icon={Target}
          iconAccent="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
          delay={0.15}
        >
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
                  <RTooltip contentStyle={tooltipStyle} />
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
        </ChartCard>
      </div>

      {/* ─── Chart row 2: Satisfaction trend (violet) + Channel donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Satisfaction trend"
          description="Last 14 days — avg rating per day"
          icon={Star}
          iconAccent="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          delay={0.2}
          className="lg:col-span-2"
          badge={
            <Badge
              variant="secondary"
              className="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
            >
              <Star className="h-3 w-3" />
              {avgSatisfaction.toFixed(1)} avg
            </Badge>
          }
        >
          <div className="h-[260px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredSatTrend}
                  margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="satGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    domain={[0, 5]}
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RTooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#satGrad)"
                    dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#8b5cf6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Channel breakdown"
          description="Where conversations start"
          icon={Globe}
          iconAccent="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
          delay={0.25}
        >
          <div className="h-[200px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : channelData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {channelData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1.5 mt-2">
            {channelData.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-2">
                No channels yet
              </div>
            ) : (
              channelData.map((c) => {
                const total = channelData.reduce((s, x) => s + x.value, 0);
                const pct = total > 0 ? ((c.value / total) * 100).toFixed(0) : "0";
                return (
                  <div
                    key={c.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: c.color }}
                      />
                      {c.name === "Widget" ? (
                        <Globe className="h-3 w-3" />
                      ) : c.name === "API" ? (
                        <Code className="h-3 w-3" />
                      ) : null}
                      {c.name}
                    </span>
                    <span className="font-medium">
                      {c.value} ({pct}%)
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </ChartCard>
      </div>

      {/* ─── Chart row 3: Response time distribution + Hourly activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Conversation length distribution"
          description="Conversations by message count"
          icon={Clock}
          iconAccent="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
          delay={0.3}
          badge={
            <Badge
              variant="secondary"
              className="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
            >
              {responseTimeDist.reduce((s, r) => s + r.count, 0)} convos
            </Badge>
          }
        >
          <div className="h-[260px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={responseTimeDist}
                  layout="vertical"
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="range"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <RTooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {responseTimeDist.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? "#8b5cf6" : i === 1 ? "#a855f7" : i === 2 ? "#c026d3" : "#d946ef"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Mini bar legend */}
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Shorter conversations = faster resolutions</span>
            <span>Max: {maxRtd}</span>
          </div>
        </ChartCard>

        <ChartCard
          title="Hourly activity"
          description="Conversation volume by hour of day"
          icon={Activity}
          iconAccent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          delay={0.35}
          badge={
            peakHourValue >= 0 ? (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                Peak: {fmtHour(peakHourValue)}
              </Badge>
            ) : undefined
          }
        >
          <div className="h-[260px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hourlyData}
                  margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RTooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {hourlyData.map((h) => (
                      <Cell
                        key={h.raw}
                        fill={h.raw === peakHourValue ? "#059669" : "#10b981"}
                        fillOpacity={h.raw === peakHourValue ? 1 : 0.55}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
              Peak hour highlighted
            </span>
            <span>24-hour window</span>
          </div>
        </ChartCard>
      </div>

      {/* ─── Top questions ─────────────────────────────────────────── */}
      <motion.div {...stagger(8)}>
        <Card className="print-card rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">Top questions</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Most asked by your visitors
                </p>
              </div>
            </div>
            {topQuestions.length > 0 && (
              <Badge variant="secondary">{topQuestions.length} unique</Badge>
            )}
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
                      <span className="font-medium truncate pr-3">{q.question}</span>
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
        <div className="no-print fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-3 py-1.5 text-xs shadow-md">
          <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
          Refreshing…
        </div>
      )}
    </div>
  );
}
