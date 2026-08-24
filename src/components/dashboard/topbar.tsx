"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

type BreadcrumbItem = { label: string; href?: string };

const pageMeta: Record<string, { title: string; subtitle: string; parent?: BreadcrumbItem }> = {
  "/dashboard": { title: "Overview", subtitle: "Your support overview at a glance" },
  "/conversations": { title: "Inbox", subtitle: "Live & recent customer conversations" },
  "/scheduler": { title: "Scheduler", subtitle: "Compose and schedule outbound messages" },
  "/connections": { title: "Connections", subtitle: "Connect Facebook, Instagram, WhatsApp, LinkedIn" },
  "/chatbot": { title: "AI Chatbot", subtitle: "Train and customize your AI agent" },
  "/contacts": { title: "Contacts", subtitle: "Visitors captured from your widget" },
  "/analytics": { title: "Analytics", subtitle: "Performance insights & trends" },
  "/settings": { title: "Settings", subtitle: "Manage your organization & team" },
  "/widget-demo": { title: "Widget demo", subtitle: "Preview & embed your chat widget" },
};

const mobileNav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/conversations", label: "Inbox" },
  { href: "/scheduler", label: "Scheduler" },
  { href: "/connections", label: "Connections" },
  { href: "/chatbot", label: "AI Chatbot" },
  { href: "/contacts", label: "Contacts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/widget-demo", label: "Widget demo" },
  { href: "/settings", label: "Settings" },
];

export function Topbar({ userName, orgName }: { userName: string; orgName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const exactMeta = pageMeta[pathname];
  const basePath = "/" + (pathname?.split("/").filter(Boolean)[0] ?? "");
  const meta = exactMeta ?? pageMeta[basePath] ?? pageMeta["/dashboard"];

  const breadcrumbs: BreadcrumbItem[] = [];
  if (meta.parent) breadcrumbs.push(meta.parent);
  if (!exactMeta && basePath !== pathname) {
    breadcrumbs.push({ label: pageMeta[basePath]?.title ?? basePath, href: basePath });
    const subSegment = pathname?.split("/").filter(Boolean).slice(1).join("/") ?? "";
    breadcrumbs.push({ label: subSegment.length > 20 ? subSegment.slice(0, 20) + "…" : subSegment });
  } else {
    breadcrumbs.push({ label: meta.title });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center gap-2.5 px-4 h-14 border-b">
            <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-semibold">R</span>
            </div>
            <div className="font-semibold text-sm">ReplyAI</div>
          </div>
          <nav className="p-2 space-y-0.5">
            {mobileNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors truncate">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn("truncate", isLast && "text-foreground font-medium")}>
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {meta.subtitle}
        </p>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-9 px-2">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {userName.charAt(0).toUpperCase()}
            </div>
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
            className="text-foreground"
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
