"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Menu,
  LogOut,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { CommandPalette } from "@/components/dashboard/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type BreadcrumbItem = { label: string; href?: string };

const pageMeta: Record<string, { title: string; subtitle: string; parent?: BreadcrumbItem }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Your support overview at a glance" },
  "/conversations": { title: "Inbox", subtitle: "Live & recent customer conversations" },
  "/chatbot": { title: "AI Chatbot", subtitle: "Train and customize your AI agent" },
  "/contacts": { title: "Contacts", subtitle: "Visitors captured from your widget" },
  "/analytics": { title: "Analytics", subtitle: "Performance insights & trends" },
  "/settings": { title: "Settings", subtitle: "Manage your organization & team" },
  "/widget-demo": { title: "Widget Demo", subtitle: "Preview & embed your chat widget" },
};

const mobileNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/conversations", label: "Inbox" },
  { href: "/chatbot", label: "AI Chatbot" },
  { href: "/contacts", label: "Contacts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/widget-demo", label: "Widget Demo" },
  { href: "/settings", label: "Settings" },
];

export function Topbar({ userName, orgName }: { userName: string; orgName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [botStatus, setBotStatus] = useState<"ACTIVE" | "PAUSED" | null>(null);

  // Determine current page meta and breadcrumbs
  const exactMeta = pageMeta[pathname];
  // For sub-pages like /conversations/[id]
  const basePath = "/" + (pathname?.split("/").filter(Boolean)[0] ?? "");
  const meta = exactMeta ?? pageMeta[basePath] ?? pageMeta["/dashboard"];

  // Build breadcrumb items
  const breadcrumbs: BreadcrumbItem[] = [];
  if (meta.parent) {
    breadcrumbs.push(meta.parent);
  }
  // If we're on a sub-page that isn't exactly matched
  if (!exactMeta && basePath !== pathname) {
    breadcrumbs.push({ label: pageMeta[basePath]?.title ?? basePath, href: basePath });
    // Show the sub-page as the last crumb (no link)
    const subSegment = pathname?.split("/").filter(Boolean).slice(1).join("/") ?? "";
    breadcrumbs.push({ label: subSegment.length > 20 ? subSegment.slice(0, 20) + "…" : subSegment });
  } else {
    breadcrumbs.push({ label: meta.title });
  }

  // Fetch bot status
  useEffect(() => {
    async function fetchBotStatus() {
      try {
        const res = await fetch("/api/chatbot", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setBotStatus(data.chatbot?.status ?? null);
      } catch {
        // Silently fail
      }
    }
    fetchBotStatus();
  }, []);

  const isBotActive = botStatus === "ACTIVE";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 md:px-6">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center gap-2.5 px-5 h-16 border-b">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="font-bold">ReplyAI</div>
          </div>
          <nav className="p-3 space-y-1">
            {mobileNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Breadcrumb */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors truncate">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn("truncate", isLast ? "text-foreground font-semibold text-base md:text-lg leading-tight" : "")}>
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <p className="text-[11px] md:text-xs text-muted-foreground truncate">
          {meta.subtitle}
        </p>
      </div>

      {/* Bot status indicator */}
      {botStatus !== null && (
        <Badge
          className={cn(
            "h-6 px-2 text-[10px] font-semibold gap-1.5 border-0",
            isBotActive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          )}
        >
          <Bot className="h-3 w-3" />
          {isBotActive ? "Active" : "Paused"}
        </Badge>
      )}

      {/* Command palette trigger (desktop) */}
      <CommandPalette />

      <NotificationsBell />
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-9 px-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="leading-tight">
              <div className="text-sm font-medium">{userName}</div>
              <div className="text-xs text-muted-foreground truncate">{orgName}</div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-600 focus:text-rose-600"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              setTimeout(() => { window.location.href = "/login"; }, 50);
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
