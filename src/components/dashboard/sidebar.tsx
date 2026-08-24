"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Users,
  BarChart3,
  Settings,
  Code2,
  Calendar,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, section: "Main" },
  { href: "/conversations", label: "Inbox", icon: MessageSquare, section: "Main" },
  { href: "/scheduler", label: "Scheduler", icon: Calendar, section: "Main" },
  { href: "/connections", label: "Connections", icon: Plug, section: "Main" },

  { href: "/chatbot", label: "AI Chatbot", icon: Bot, section: "Manage" },
  { href: "/contacts", label: "Contacts", icon: Users, section: "Manage" },

  { href: "/analytics", label: "Analytics", icon: BarChart3, section: "Insights" },

  { href: "/widget-demo", label: "Widget demo", icon: Code2, section: "Config" },
  { href: "/settings", label: "Settings", icon: Settings, section: "Config" },
];

const sectionOrder = ["Main", "Manage", "Insights", "Config"];
const sectionLabels: Record<string, string> = {
  Main: "Workspace",
  Manage: "Manage",
  Insights: "Insights",
  Config: "Configuration",
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
  const [quickStats, setQuickStats] = useState<{ total: number; active: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const res = await fetch("/api/analytics", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setQuickStats({
          total: data.totalConversations ?? 0,
          active: data.statusBreakdown?.human ?? 0,
        });
      } catch {
        // stats are optional
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  const groupedNav = sectionOrder.map((section) => ({
    section,
    items: nav.filter((n) => n.section === section),
  }));

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r bg-sidebar h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b">
        <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
          <span className="text-background text-xs font-semibold">R</span>
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-semibold text-sm tracking-tight">ReplyAI</div>
          <div className="text-[11px] text-muted-foreground truncate">{orgName}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-thin px-2 py-3">
        {groupedNav.map((group, gi) => (
          <div key={group.section} className={gi > 0 ? "mt-5" : ""}>
            <div className="px-2 mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {sectionLabels[group.section]}
            </div>
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
              const isInbox = item.href === "/conversations";
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isInbox && activeConvCount != null && activeConvCount > 0 && (
                    <span className="text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded bg-foreground text-background">
                      {activeConvCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / user */}
      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
              {userRole}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
