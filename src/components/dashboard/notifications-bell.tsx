"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Bot, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: string;
  visitorName: string;
  preview: string;
  conversationId: string;
  createdAt: string;
  read: boolean;
};

const ICONS: Record<string, { icon: typeof MessageSquare }> = {
  new_message: { icon: MessageSquare },
  ai_reply: { icon: Bot },
  takeover: { icon: Headphones },
};

export function NotificationsBell() {
  const [data, setData] = useState<{ notifications: Notification[]; unread: number }>({
    notifications: [],
    unread: 0,
  });
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-[18px] w-[18px]" />
          {data.unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background">
              {data.unread > 9 ? "9+" : data.unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {data.unread > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {data.unread} new
            </Badge>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scroll-thin">
          {data.notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (
            data.notifications.map((n) => {
              const cfg = ICONS[n.type] || ICONS.new_message;
              const Icon = cfg.icon;
              return (
                <Link
                  key={n.id}
                  href={`/conversations?id=${n.conversationId}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-0"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted/40">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-tight">
                      <span className="font-medium">{n.visitorName}</span>
                      <span className="text-muted-foreground">
                        {n.type === "new_message" ? " sent a message" : n.type === "ai_reply" ? " got an AI reply" : " needs attention"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{n.preview}</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-foreground mt-1.5 shrink-0" />}
                </Link>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <Link
          href="/conversations"
          onClick={() => setOpen(false)}
          className="block px-3 py-2.5 text-center text-xs font-medium hover:bg-accent"
        >
          View all conversations
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
