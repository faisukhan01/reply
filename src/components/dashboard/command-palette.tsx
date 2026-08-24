"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Users,
  BarChart3,
  Settings,
  Code2,
  Sun,
  Moon,
  Plus,
  Sparkles,
  Search,
  Zap,
  Plug,
  Calendar,
  HelpCircle,
} from "lucide-react";
import { useTheme } from "next-themes";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Navigation" },
  { label: "Inbox", href: "/conversations", icon: MessageSquare, group: "Navigation" },
  { label: "Automation", href: "/automation", icon: Zap, group: "Navigation" },
  { label: "Scheduler", href: "/scheduler", icon: Calendar, group: "Navigation" },
  { label: "Connections", href: "/connections", icon: Plug, group: "Navigation" },
  { label: "AI Chatbot Builder", href: "/chatbot", icon: Bot, group: "Navigation" },
  { label: "Contacts", href: "/contacts", icon: Users, group: "Navigation" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, group: "Navigation" },
  { label: "Setup Guide", href: "/automation-guide", icon: HelpCircle, group: "Navigation" },
  { label: "Widget Demo", href: "/widget-demo", icon: Code2, group: "Navigation" },
  { label: "Settings", href: "/settings", icon: Settings, group: "Navigation" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 50);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-xs text-muted-foreground hover:bg-muted transition-colors w-64"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search or jump to...</span>
        <kbd className="ml-auto pointer-events-none select-none rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => run(() => router.push("/conversations"))}>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Open live inbox</span>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/automation"))}>
              <Zap className="mr-2 h-4 w-4" />
              <span>Create an automation rule</span>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/automation-guide"))}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>How to connect platforms</span>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/chatbot"))}>
              <Bot className="mr-2 h-4 w-4" />
              <span>Train your AI chatbot</span>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/widget-demo"))}>
              <Code2 className="mr-2 h-4 w-4" />
              <span>Get embed snippet</span>
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/contacts"))}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Add a contact</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => run(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Switch to light mode</span>
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Switch to dark mode</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Help">
            <CommandItem onSelect={() => run(() => router.push("/widget-demo"))}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>See a live demo</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
