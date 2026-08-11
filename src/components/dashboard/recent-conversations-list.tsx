"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type PreviewMessage = {
  role: string; // VISITOR | AI | AGENT
  content: string;
  createdAt: string; // ISO
};

export type RecentConversation = {
  id: string;
  visitorName: string | null;
  status: string; // AI | HUMAN | CLOSED
  createdAt: string; // ISO
  lastMessage: string | null;
  // extras for polish
  unread?: number; // unread count badge — drives "needs attention"
  online?: boolean; // online/offline dot
  previewMessages?: PreviewMessage[]; // last 3 messages for hover preview
};

const statusBorderMap: Record<string, string> = {
  AI: "border-l-violet-400 dark:border-l-violet-500/60",
  HUMAN: "border-l-emerald-400 dark:border-l-emerald-500/60",
  CLOSED: "border-l-zinc-300 dark:border-l-zinc-600",
};

const statusBadgeMap: Record<
  string,
  { label: string; className: string }
> = {
  AI: {
    label: "AI",
    className:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-transparent",
  },
  HUMAN: {
    label: "Human",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-transparent",
  },
  CLOSED: {
    label: "Closed",
    className:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-300 border-transparent",
  },
};

function visitorInitial(name: string | null) {
  const n = (name ?? "Visitor").trim();
  return n.charAt(0).toUpperCase() || "V";
}

function roleLabel(role: string) {
  if (role === "VISITOR") return "Visitor";
  if (role === "AI") return "AI";
  if (role === "AGENT") return "Agent";
  return role;
}

function roleColor(role: string) {
  if (role === "VISITOR") return "text-zinc-600 dark:text-zinc-300";
  if (role === "AI") return "text-violet-600 dark:text-violet-300";
  if (role === "AGENT") return "text-emerald-600 dark:text-emerald-300";
  return "text-muted-foreground";
}

function HoverPreview({ conv }: { conv: RecentConversation }) {
  const messages = conv.previewMessages ?? [];
  if (messages.length === 0) {
    return (
      <div className="w-64 space-y-1.5 p-1 text-xs">
        <p className="font-semibold text-popover-foreground">
          {conv.visitorName ?? "Anonymous visitor"}
        </p>
        <p className="text-muted-foreground italic">No messages yet</p>
      </div>
    );
  }
  return (
    <div className="w-72 space-y-2 p-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-popover-foreground">
          {conv.visitorName ?? "Anonymous visitor"}
        </p>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Last 3 messages
        </span>
      </div>
      <div className="space-y-1.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className="rounded-md border border-border/60 bg-muted/40 p-2"
          >
            <div
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide",
                roleColor(m.role)
              )}
            >
              {roleLabel(m.role)}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-popover-foreground">
              {m.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentConversationsList({
  conversations,
}: {
  conversations: RecentConversation[];
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <ul className="max-h-96 divide-y divide-border overflow-y-auto scroll-thin">
      {conversations.map((c) => {
        const badge = statusBadgeMap[c.status] ?? statusBadgeMap.CLOSED;
        const needsAttention = (c.unread ?? 0) > 0;
        return (
          <li key={c.id}>
            <Tooltip delayDuration={250}>
              <TooltipTrigger asChild>
                <Link
                  href={`/conversations?id=${c.id}`}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg border-l-2 px-2 py-3 transition-colors hover:bg-muted/50",
                    statusBorderMap[c.status] ?? statusBorderMap.CLOSED,
                    needsAttention && "bg-amber-50/40 dark:bg-amber-500/5"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-9 border">
                      <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold dark:bg-violet-500/20 dark:text-violet-300">
                        {visitorInitial(c.visitorName)}
                      </AvatarFallback>
                    </Avatar>
                    {/* online/offline dot */}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                        c.online
                          ? "bg-emerald-500"
                          : "bg-zinc-300 dark:bg-zinc-600"
                      )}
                      aria-label={c.online ? "Online" : "Offline"}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.visitorName ?? "Anonymous visitor"}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.lastMessage ?? "No messages yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {needsAttention && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white shadow-sm ring-2 ring-background">
                        {c.unread}
                      </span>
                    )}
                    <Badge className={badge.className}>{badge.label}</Badge>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                align="center"
                className="border bg-popover text-popover-foreground shadow-xl"
              >
                <HoverPreview conv={c} />
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
