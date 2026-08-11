"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Users,
  BarChart3,
  Settings,
  Code2,
  Sparkles,
  MessageCircle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type UserRole = "OWNER" | "ADMIN" | "AGENT";

const roleBadgeStyles: Record<UserRole, { bg: string; text: string; label: string }> = {
  OWNER: {
    bg: "bg-violet-100 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    label: "Owner",
  },
  ADMIN: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Admin",
  },
  AGENT: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    label: "Agent",
  },
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  section: string;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "D", section: "Main" },
  { href: "/conversations", label: "Inbox", icon: MessageSquare, shortcut: "I", section: "Main" },
  { href: "/chatbot", label: "AI Chatbot", icon: Bot, shortcut: "C", section: "Manage" },
  { href: "/contacts", label: "Contacts", icon: Users, shortcut: "K", section: "Manage" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, shortcut: "A", section: "Insights" },
  { href: "/widget_demo", label: "Widget Demo", icon: Code2, shortcut: "W", section: "Config" },
  { href: "/settings", label: "Settings", icon: Settings, shortcut: "S", section: "Config" },
];

// Fix: widget_demo path should match the real route
const navResolved = nav.map((n) =>
  n.href === "/widget_demo" ? { ...n, href: "/widget-demo" } : n
);

const sectionOrder = ["Main", "Manage", "Insights", "Config"];
const sectionLabels: Record<string, string> = {
  Main: "Main",
  Manage: "Manage",
  Insights: "Insights",
  Config: "Config",
};

type QuickStats = {
  totalConversations: number;
  activeNow: number;
};

export function Sidebar({
  orgName,
  userName,
  userRole = "OWNER",
  activeConvCount,
}: {
  orgName: string;
  userName: string;
  userRole?: string;
  activeConvCount?: number;
}) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);

  // Fetch quick stats from analytics
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/analytics", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setQuickStats({
          totalConversations: data.totalConversations ?? 0,
          activeNow: data.statusBreakdown?.human ?? 0,
        });
      } catch {
        // Silently fail — stats are optional
      }
    }
    fetchStats();
  }, []);

  const role = (["OWNER", "ADMIN", "AGENT"].includes(userRole) ? userRole : "AGENT") as UserRole;
  const roleStyle = roleBadgeStyles[role];

  // Group nav items by section
  const groupedNav = sectionOrder.map((section) => ({
    section,
    items: navResolved.filter((n) => n.section === section),
  }));

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r bg-sidebar h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-[15px] tracking-tight">ReplyAI</div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
            {orgName}
          </div>
        </div>
      </div>

      {/* Nav with sections */}
      <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-1">
        {groupedNav.map((group, gi) => (
          <div key={group.section}>
            {/* Section separator + label (skip for first) */}
            {gi > 0 && (
              <div className="flex items-center gap-2 pt-3 pb-1.5">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {sectionLabels[group.section]}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              const isHovered = hoveredItem === item.href;
              const isInbox = item.href === "/conversations";

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {/* Active gradient left border */}
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-bar"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}

                      {/* Hover glow effect */}
                      {active && (
                        <motion.div
                          className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/8 to-fuchsia-500/8"
                          layoutId="sidebar-active-glow"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}

                      <Icon className={cn("h-[18px] w-[18px] shrink-0 relative z-10", active && "text-violet-600 dark:text-violet-400")} />
                      <span className="flex-1 relative z-10">{item.label}</span>

                      {/* Inbox active conversation count badge */}
                      {isInbox && activeConvCount != null && activeConvCount > 0 && (
                        <Badge className="relative z-10 h-5 min-w-[20px] px-1.5 text-[10px] font-semibold bg-rose-500 text-white border-rose-500 hover:bg-rose-600">
                          {activeConvCount}
                        </Badge>
                      )}

                      {/* Keyboard shortcut hint on hover */}
                      {item.shortcut && isHovered && !active && (
                        <motion.span
                          initial={{ opacity: 0, x: 4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 4 }}
                          className="relative z-10 text-[10px] font-mono text-muted-foreground/50 bg-muted/50 px-1 py-0.5 rounded"
                        >
                          {item.shortcut}
                        </motion.span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.label}
                    {item.shortcut && (
                      <span className="ml-2 text-muted-foreground font-mono">⌘{item.shortcut}</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Quick Stats Mini Bar */}
      <div className="px-3 pb-1">
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="font-medium">
              {quickStats?.totalConversations ?? "—"}
            </span>
            <span>total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium">
              {quickStats?.activeNow ?? "—"}
            </span>
            <span>active</span>
          </div>
        </div>
      </div>

      {/* Upgrade card */}
      <div className="p-3 pt-2">
        <div className="rounded-xl border bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-semibold">Upgrade to Scale</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            Unlimited conversations, priority support & custom branding.
          </p>
          <Button size="sm" className="w-full h-8 text-xs">
            View plans
          </Button>
        </div>
      </div>

      {/* User */}
      <div className="border-t px-3 py-3 flex items-center gap-2.5">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
          {/* Online status dot */}
          <span className="absolute bottom-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-sidebar" />
          </span>
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{userName}</span>
            <Badge
              className={cn(
                "h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wider border-0",
                roleStyle.bg,
                roleStyle.text
              )}
            >
              {roleStyle.label}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
