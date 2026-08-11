"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedStat } from "@/components/dashboard/animated-stat";
import { MiniSparkline } from "@/components/dashboard/mini-sparkline";
import {
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Bot,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

type StatItem = {
  label: string;
  value: string | number;
  icon: string; // icon key — server-safe
  tone: "violet" | "emerald" | "amber" | "fuchsia";
  delta: string;
  deltaPositive?: boolean; // optional — defaults to true
  trend?: number[]; // last 7 days of daily counts (optional sparkline)
};

const iconMap: Record<string, LucideIcon> = {
  MessageSquare,
  Bot,
  Star,
  Users,
};

const toneMap: Record<
  string,
  { bg: string; fg: string; hex: string; ring: string; glow: string }
> = {
  violet: {
    bg: "bg-violet-100 dark:bg-violet-500/15",
    fg: "text-violet-600 dark:text-violet-300",
    hex: "#8b5cf6",
    ring: "hover:ring-violet-300/60 dark:hover:ring-violet-500/40",
    glow: "hover:shadow-violet-500/15",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
    fg: "text-emerald-600 dark:text-emerald-300",
    hex: "#10b981",
    ring: "hover:ring-emerald-300/60 dark:hover:ring-emerald-500/40",
    glow: "hover:shadow-emerald-500/15",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-500/15",
    fg: "text-amber-600 dark:text-amber-300",
    hex: "#f59e0b",
    ring: "hover:ring-amber-300/60 dark:hover:ring-amber-500/40",
    glow: "hover:shadow-amber-500/15",
  },
  fuchsia: {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-500/15",
    fg: "text-fuchsia-600 dark:text-fuchsia-300",
    hex: "#d946ef",
    ring: "hover:ring-fuchsia-300/60 dark:hover:ring-fuchsia-500/40",
    glow: "hover:shadow-fuchsia-500/15",
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export function StatCards({ stats }: { stats: StatItem[] }) {
  return (
    <motion.section
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((s) => {
        const Icon = iconMap[s.icon] ?? MessageSquare;
        const tone = toneMap[s.tone];
        const positive = s.deltaPositive !== false;
        return (
          <motion.div
            key={s.label}
            variants={cardVariants}
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="group"
          >
            <Card
              className={`rounded-xl shadow-sm transition-all duration-300 ring-1 ring-transparent ${tone.ring} hover:shadow-lg ${tone.glow} hover:-translate-y-0.5`}
            >
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${tone.bg} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className={`size-5 ${tone.fg}`} />
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                      positive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                    }`}
                  >
                    {positive ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {s.delta}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight tabular-nums">
                    <AnimatedStat value={s.value} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.label}
                  </div>
                </div>
                {/* 7-day mini trend sparkline */}
                <div className="mt-1 flex items-end justify-between gap-2 border-t pt-2.5">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                    7-day trend
                  </span>
                  {s.trend && s.trend.length > 0 ? (
                    <MiniSparkline
                      points={s.trend}
                      width={84}
                      height={28}
                      stroke={tone.hex}
                      strokeWidth={1.5}
                      ariaLabel={`${s.label} trend (last 7 days)`}
                    />
                  ) : (
                    <span className="text-[11px] text-muted-foreground/70">
                      —
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.section>
  );
}
