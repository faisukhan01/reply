"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedStat } from "@/components/dashboard/animated-stat";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StatItem = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: "violet" | "emerald" | "amber" | "fuchsia";
  delta: string;
};

const toneMap: Record<string, { bg: string; fg: string }> = {
  violet: { bg: "bg-violet-100 dark:bg-violet-500/15", fg: "text-violet-600 dark:text-violet-300" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-500/15", fg: "text-emerald-600 dark:text-emerald-300" },
  amber: { bg: "bg-amber-100 dark:bg-amber-500/15", fg: "text-amber-600 dark:text-amber-300" },
  fuchsia: { bg: "bg-fuchsia-100 dark:bg-fuchsia-500/15", fg: "text-fuchsia-600 dark:text-fuchsia-300" },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
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
        const Icon = s.icon;
        const tone = toneMap[s.tone];
        return (
          <motion.div key={s.label} variants={cardVariants}>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${tone.bg}`}>
                    <Icon className={`size-5 ${tone.fg}`} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="size-3.5" />
                    {s.delta}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight tabular-nums">
                    <AnimatedStat value={s.value} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.section>
  );
}
