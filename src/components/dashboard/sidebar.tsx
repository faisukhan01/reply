"use client";

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
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conversations", label: "Inbox", icon: MessageSquare, badge: "Live" },
  { href: "/chatbot", label: "AI Chatbot", icon: Bot },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/widget-demo", label: "Widget Demo", icon: Code2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ orgName, userName }: { orgName: string; userName: string }) {
  const pathname = usePathname();

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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {item.badge}
                </span>
              )}
              {active && <ChevronRight className="h-4 w-4 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade card */}
      <div className="p-3">
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
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-semibold">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="text-sm font-medium truncate">{userName}</div>
          <div className="text-[11px] text-muted-foreground">Owner</div>
        </div>
      </div>
    </aside>
  );
}
