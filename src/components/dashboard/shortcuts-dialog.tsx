"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground shadow-[0_1px_0_0_var(--border)]">
      {children}
    </kbd>
  );
}

const shortcuts = [
  { category: "General", items: [
    { keys: ["⌘", "K"], label: "Command palette" },
    { keys: ["⌘", "/"], label: "Show shortcuts" },
    { keys: ["?"], label: "Show help" },
    { keys: ["Esc"], label: "Close dialog" },
  ]},
  { category: "Navigation", items: [
    { keys: ["G", "D"], label: "Go to Dashboard" },
    { keys: ["G", "I"], label: "Go to Inbox" },
    { keys: ["G", "C"], label: "Go to Chatbot" },
    { keys: ["G", "A"], label: "Go to Analytics" },
    { keys: ["G", "S"], label: "Go to Settings" },
  ]},
];

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Keyboard className="size-4 text-violet-600 dark:text-violet-300" />
            </div>
            <DialogTitle className="text-lg">Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </div>
              <div className="grid gap-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="text-sm">{item.label}</span>
                    <div className="flex items-center gap-0.5">
                      {item.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          {i > 0 && (
                            <span className="mx-0.5 text-[10px] text-muted-foreground">then</span>
                          )}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          Press <Kbd>⌘</Kbd> <Kbd>/</Kbd> anytime to toggle this panel
        </div>
      </DialogContent>
    </Dialog>
  );
}
