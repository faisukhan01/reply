"use client";

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
  icon: string;
  delta: string;
  deltaPositive?: boolean;
  trend?: number[];
};

const iconMap: Record<string, LucideIcon> = {
  MessageSquare,
  Bot,
  Star,
  Users,
};

export function StatCards({ stats }: { stats: StatItem[] }) {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = iconMap[s.icon] ?? MessageSquare;
        const positive = s.deltaPositive !== false;
        return (
          <Card key={s.label} className="card-hover rounded-lg border bg-card shadow-none">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between">
                <div className="flex size-8 items-center justify-center rounded-md border bg-muted/40">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
                    positive ? "text-foreground" : "text-destructive"
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
                <div className="text-2xl font-semibold tracking-tight tabular-nums">
                  <AnimatedStat value={s.value} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.label}
                </div>
              </div>
              {s.trend && s.trend.length > 0 ? (
                <div className="mt-1 flex items-end justify-between gap-2 border-t pt-2.5">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                    7-day trend
                  </span>
                  <MiniSparkline
                    points={s.trend}
                    width={84}
                    height={28}
                    stroke="var(--foreground)"
                    strokeWidth={1.25}
                    fill={false}
                    ariaLabel={`${s.label} trend (last 7 days)`}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
