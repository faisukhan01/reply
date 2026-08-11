"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, Search, Bell, LogOut, Settings, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const titles: Record<string, { title: string; subtitle: string }> = {
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
  const meta = titles[pathname] ?? titles["/dashboard"];
  const [open, setOpen] = useState(false);

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

      <div className="flex-1 min-w-0">
        <h1 className="text-base md:text-lg font-semibold leading-tight truncate">
          {meta.title}
        </h1>
        <p className="text-[11px] md:text-xs text-muted-foreground truncate">
          {meta.subtitle}
        </p>
      </div>

      {/* Search */}
      <div className="hidden lg:flex items-center w-64 relative">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:border-border"
        />
      </div>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500" />
      </Button>

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
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
