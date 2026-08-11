"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { formatDistanceToNow, format } from "date-fns";
import {
  Search,
  Send,
  Bot,
  User as UserIcon,
  MessageSquare,
  MoreVertical,
  Check,
  X,
  Clock,
  Headphones,
  Circle,
  ArrowLeft,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────
type ConvStatus = "AI" | "HUMAN" | "CLOSED";

type LastMessage = {
  content: string;
  role: "VISITOR" | "AI" | "AGENT";
  createdAt: string;
};

type ConversationListItem = {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorId: string;
  status: ConvStatus;
  satisfaction: number | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage: LastMessage | null;
  messageCount: number;
};

type Message = {
  id: string;
  conversationId: string;
  role: "VISITOR" | "AI" | "AGENT";
  content: string;
  createdAt: string;
};

type ConversationDetail = {
  id: string;
  visitorId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: ConvStatus;
  satisfaction: number | null;
  assignedToId: string | null;
  channel: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  chatbot: { id: string; name: string };
};

// ─── Helpers ──────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-purple-500",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function avatarColor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusBadgeClass(status: ConvStatus): string {
  switch (status) {
    case "AI":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border-violet-200 dark:border-violet-500/20";
    case "HUMAN":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20";
    case "CLOSED":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function statusLabel(status: ConvStatus): string {
  switch (status) {
    case "AI":
      return "AI";
    case "HUMAN":
      return "Human";
    case "CLOSED":
      return "Closed";
  }
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function msgTime(iso: string): string {
  try {
    return format(new Date(iso), "p");
  } catch {
    return "";
  }
}

// ─── Realtime socket singleton ────────────────────────────────────
let socketSingleton: Socket | null = null;
function getSocket(): Socket {
  if (socketSingleton) return socketSingleton;
  socketSingleton = io("/?XTransformPort=3001", {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000,
  });
  return socketSingleton;
}

// ─── Component ────────────────────────────────────────────────────
type Tab = "ALL" | "AI" | "HUMAN" | "CLOSED";

export default function ConversationsPage() {
  // List state
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    []
  );
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");

  // Selected conversation
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Composer
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Mobile view toggle
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Typing indicator (AI)
  const [aiTyping, setAiTyping] = useState(false);
  const aiTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Socket ref
  const socketRef = useRef<Socket | null>(null);

  // Unread tracking (conversationId -> count) — simplified: mark unread when a
  // visitor message arrives for a non-selected conversation.
  const [unread, setUnread] = useState<Record<string, number>>({});

  // ─── Fetch list ────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tab !== "ALL") params.set("status", tab);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/conversations?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, [tab, search]);

  // Debounce search
  useEffect(() => {
    setLoadingList(true);
    const t = setTimeout(() => {
      void fetchList();
    }, 250);
    return () => clearTimeout(t);
  }, [search, tab, fetchList]);

  // Initial load + polling fallback (every 10s)
  useEffect(() => {
    void fetchList();
    const interval = setInterval(() => {
      void fetchList();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchList]);

  // ─── Socket setup ──────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onMessageNew = (payload: {
      conversationId: string;
      message: Message;
    }) => {
      if (!payload?.conversationId || !payload?.message) return;
      const { conversationId, message } = payload;

      // If this is the selected conversation, append to messages.
      if (conversationId === selectedId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        // Auto-scroll handled by effect below.
      }

      // Update list preview + bump updatedAt.
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) {
          // New conversation — trigger a refetch.
          void fetchList();
          return prev;
        }
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = {
          content: message.content,
          role: message.role,
          createdAt: message.createdAt,
        };
        conv.updatedAt = message.createdAt;
        // Move to top.
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });

      // Unread tracking for non-selected conversations when visitor messages.
      if (
        conversationId !== selectedId &&
        (message.role === "VISITOR" || message.role === "AI")
      ) {
        setUnread((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? 0) + 1,
        }));
      }

      // If visitor sent a message, show a brief AI typing indicator.
      if (message.role === "VISITOR" && conversationId === selectedId) {
        setAiTyping(true);
        if (aiTypingTimer.current) clearTimeout(aiTypingTimer.current);
        aiTypingTimer.current = setTimeout(() => setAiTyping(false), 3000);
      }
    };

    const onConvUpdate = (payload: {
      conversationId: string;
      patch: Partial<ConversationListItem>;
    }) => {
      if (!payload?.conversationId) return;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId
            ? { ...c, ...payload.patch }
            : c
        )
      );
      if (payload.conversationId === selectedId && detail) {
        setDetail((d) => (d ? { ...d, ...payload.patch } : d));
      }
    };

    socket.on("message:new", onMessageNew);
    socket.on("conversation:update", onConvUpdate);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("conversation:update", onConvUpdate);
    };
  }, [selectedId, detail, fetchList]);

  // ─── Join/leave conversation room on select ────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedId) return;
    socket.emit("join:conversation", selectedId);
    return () => {
      socket.emit("leave:conversation", selectedId);
    };
  }, [selectedId]);

  // ─── Fetch detail on select ────────────────────────────────────
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setMessages([]);
    setDetail(null);
    (async () => {
      try {
        const res = await fetch(`/api/conversations/${selectedId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setDetail(data.conversation);
        setMessages(data.messages ?? []);
        // Clear unread for this conversation.
        setUnread((prev) => {
          if (!prev[selectedId]) return prev;
          const next = { ...prev };
          delete next[selectedId];
          return next;
        });
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // ─── Auto-scroll to bottom on new messages ─────────────────────
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  // ─── Counts per tab ────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { ALL: conversations.length, AI: 0, HUMAN: 0, CLOSED: 0 };
    for (const conv of conversations) {
      if (conv.status === "AI") c.AI++;
      else if (conv.status === "HUMAN") c.HUMAN++;
      else if (conv.status === "CLOSED") c.CLOSED++;
    }
    return c;
  }, [conversations]);

  // ─── Actions ───────────────────────────────────────────────────
  const patchConversation = useCallback(
    async (patch: { status?: ConvStatus; assignedToId?: string | null }) => {
      if (!selectedId) return;
      try {
        const res = await fetch(`/api/conversations/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) return;
        const data = await res.json();
        const updated = data.conversation as ConversationDetail;
        setDetail(updated);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === updated.id
              ? {
                  ...c,
                  status: updated.status,
                  assignedToId: updated.assignedToId,
                }
              : c
          )
        );
        // Broadcast update via socket.
        socketRef.current?.emit("conversation:update", {
          conversationId: selectedId,
          patch: {
            status: updated.status,
            assignedToId: updated.assignedToId,
          },
        });
      } catch {
        // ignore
      }
    },
    [selectedId]
  );

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const msg = data.message as Message;
      // Append locally (in case socket echo doesn't arrive — it shouldn't,
      // since the realtime service only broadcasts to OTHER clients in the
      // room, but the sender's own socket will receive it too).
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      // Emit to realtime service so the visitor widget + other inbox tabs
      // receive it live.
      socketRef.current?.emit("agent:message", {
        conversationId: selectedId,
        message: {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        },
      });
      // Update list preview.
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === selectedId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = {
          content: msg.content,
          role: msg.role,
          createdAt: msg.createdAt,
        };
        conv.updatedAt = msg.createdAt;
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }, [draft, selectedId, sending]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  const handleBack = () => setMobileView("list");

  // ─── Render ────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-9rem)] gap-4">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              Live conversations across your chatbots.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <Circle
                className={cn(
                  "size-2 fill-emerald-500 text-emerald-500",
                  socketRef.current?.connected ? "" : "opacity-30"
                )}
              />
              {socketRef.current?.connected ? "Live" : "Connecting…"}
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <MessageSquare className="size-3" />
              {counts.ALL} total
            </Badge>
          </div>
        </div>

        {/* Split pane */}
        <div className="flex flex-1 min-h-0 gap-4">
          {/* ─── Left panel: list ─────────────────────────────── */}
          <aside
            className={cn(
              "flex flex-col w-full md:w-80 lg:w-96 shrink-0 rounded-xl border bg-card overflow-hidden",
              mobileView === "detail" ? "hidden md:flex" : "flex"
            )}
          >
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search visitors…"
                  className="pl-8 bg-background"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-2 py-2 border-b overflow-x-auto scroll-thin">
              {(
                [
                  { key: "ALL", label: "All", count: counts.ALL },
                  { key: "AI", label: "AI", count: counts.AI },
                  { key: "HUMAN", label: "Human", count: counts.HUMAN },
                  { key: "CLOSED", label: "Closed", count: counts.CLOSED },
                ] as { key: Tab; label: string; count: number }[]
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                    tab === t.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                      tab === t.key
                        ? "bg-primary-foreground/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto scroll-thin">
              {loadingList && conversations.length === 0 ? (
                <ListSkeleton />
              ) : conversations.length === 0 ? (
                <EmptyList />
              ) : (
                <ul className="divide-y">
                  {conversations.map((conv) => {
                    const name = conv.visitorName || conv.visitorEmail || "Visitor";
                    const isUnread = (unread[conv.id] ?? 0) > 0;
                    const isSelected = conv.id === selectedId;
                    return (
                      <li key={conv.id}>
                        <button
                          onClick={() => handleSelect(conv.id)}
                          className={cn(
                            "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors",
                            isSelected
                              ? "bg-accent/60"
                              : "hover:bg-accent/40"
                          )}
                        >
                          <Avatar className="size-9 mt-0.5">
                            <AvatarFallback
                              className={cn(
                                "text-white text-xs font-semibold",
                                avatarColor(name)
                              )}
                            >
                              {initials(conv.visitorName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {name}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {conv.lastMessage
                                  ? timeAgo(conv.lastMessage.createdAt)
                                  : timeAgo(conv.updatedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="flex-1 truncate text-xs text-muted-foreground">
                                {conv.lastMessage
                                  ? conv.lastMessage.content
                                  : "No messages yet"}
                              </p>
                              {isUnread && (
                                <span className="size-2 rounded-full bg-violet-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-4",
                                  statusBadgeClass(conv.status)
                                )}
                              >
                                {statusLabel(conv.status)}
                              </Badge>
                              {conv.messageCount > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {conv.messageCount} msg
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* ─── Right panel: chat view ──────────────────────── */}
          <section
            className={cn(
              "flex-1 min-w-0 rounded-xl border bg-card overflow-hidden flex flex-col",
              mobileView === "list" ? "hidden md:flex" : "flex"
            )}
          >
            {!selectedId ? (
              <EmptyDetail />
            ) : (
              <>
                {/* Header */}
                <header className="flex items-center gap-3 px-4 py-3 border-b">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-2 size-8"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  {loadingDetail ? (
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ) : detail ? (
                    <>
                      <Avatar className="size-9">
                        <AvatarFallback
                          className={cn(
                            "text-white text-xs font-semibold",
                            avatarColor(
                              detail.visitorName ||
                                detail.visitorEmail ||
                                "Visitor"
                            )
                          )}
                        >
                          {initials(detail.visitorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {detail.visitorName ||
                              detail.visitorEmail ||
                              "Visitor"}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4",
                              statusBadgeClass(detail.status)
                            )}
                          >
                            {statusLabel(detail.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {detail.visitorEmail || detail.visitorId}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {detail.status !== "CLOSED" && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={
                                    detail.status === "HUMAN"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    void patchConversation({ status: "HUMAN" })
                                  }
                                  className="gap-1.5"
                                >
                                  <Headphones className="size-3.5" />
                                  <span className="hidden sm:inline">
                                    {detail.status === "HUMAN"
                                      ? "Taken over"
                                      : "Take over"}
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Take over from AI
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void patchConversation({ status: "CLOSED" })
                                  }
                                >
                                  <X className="size-3.5" />
                                  <span className="hidden sm:inline">
                                    Close
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Close conversation
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {detail.status === "CLOSED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void patchConversation({ status: "AI" })
                            }
                            className="gap-1.5"
                          >
                            <Check className="size-3.5" />
                            <span className="hidden sm:inline">Reopen</span>
                          </Button>
                        )}
                        {/* Assign dropdown (demo) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                void patchConversation({
                                  assignedToId: null,
                                })
                              }
                            >
                              <UserIcon className="size-3.5 mr-2" />
                              Unassign
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <Users className="size-3.5 mr-2" />
                              Demo team member
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Channel</DropdownMenuLabel>
                            <DropdownMenuItem disabled>
                              {detail.channel}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  ) : null}
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4 bg-muted/30">
                  {loadingDetail ? (
                    <div className="space-y-3 max-w-2xl mx-auto">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-2",
                            i % 2 === 0 ? "justify-start" : "justify-end"
                          )}
                        >
                          {i % 2 === 0 && (
                            <Skeleton className="size-7 rounded-full shrink-0" />
                          )}
                          <Skeleton
                            className={cn(
                              "h-12 rounded-2xl",
                              i % 2 === 0 ? "w-64" : "w-48"
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <MessageList messages={messages} aiTyping={aiTyping} />
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="border-t p-3 bg-card">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder={
                        detail?.status === "CLOSED"
                          ? "This conversation is closed"
                          : "Type your reply… (Enter to send, Shift+Enter for newline)"
                      }
                      disabled={detail?.status === "CLOSED"}
                      rows={2}
                      className="resize-none min-h-[44px] max-h-40 bg-background"
                    />
                    <Button
                      onClick={() => void sendMessage()}
                      disabled={
                        !draft.trim() ||
                        sending ||
                        detail?.status === "CLOSED"
                      }
                      size="icon"
                      className="size-10 shrink-0"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground">
                      {detail?.status === "CLOSED"
                        ? "Reopen to send messages"
                        : "Press Enter to send"}
                    </span>
                    {detail && (
                      <span className="text-[10px] text-muted-foreground">
                        {messages.length} messages
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── MessageList (with grouping) ──────────────────────────────────
function MessageList({
  messages,
  aiTyping,
}: {
  messages: Message[];
  aiTyping: boolean;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16">
        <MessageSquare className="size-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No messages yet</p>
        <p className="text-xs mt-1">
          Start the conversation by sending a message below.
        </p>
      </div>
    );
  }

  // Group consecutive messages by same role + < 5 min gap.
  type Group = { role: Message["role"]; items: Message[] };
  const groups: Group[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.role === msg.role &&
      last.items.length > 0 &&
      new Date(msg.createdAt).getTime() -
        new Date(last.items[last.items.length - 1].createdAt).getTime() <
        5 * 60 * 1000
    ) {
      last.items.push(msg);
    } else {
      groups.push({ role: msg.role, items: [msg] });
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {groups.map((group, gi) => (
        <MessageGroup key={gi} group={group} />
      ))}
      {aiTyping && <TypingBubble />}
    </div>
  );
}

function MessageGroup({ group }: { group: { role: Message["role"]; items: Message[] } }) {
  const isAgent = group.role === "AGENT";
  const isVisitor = group.role === "VISITOR";
  const isAI = group.role === "AI";

  const avatarColorClass =
    group.role === "VISITOR"
      ? "bg-muted-foreground"
      : group.role === "AI"
        ? "bg-violet-500"
        : "bg-fuchsia-500";

  return (
    <div
      className={cn(
        "flex gap-2 items-end",
        isAgent ? "justify-end" : "justify-start"
      )}
    >
      {!isAgent && (
        <Avatar className="size-7 mb-1 shrink-0">
          <AvatarFallback
            className={cn("text-white text-[10px] font-semibold", avatarColorClass)}
          >
            {isAI ? <Bot className="size-3.5" /> : <UserIcon className="size-3.5" />}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[75%]",
          isAgent ? "items-end" : "items-start"
        )}
      >
        {isAI && (
          <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400 px-1 flex items-center gap-1">
            <Bot className="size-3" /> AI Assistant
          </span>
        )}
        {group.items.map((msg, i) => (
          <div
            key={msg.id}
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm break-words",
              isAgent
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : isAI
                  ? "bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100 rounded-bl-sm"
                  : "bg-muted text-foreground rounded-bl-sm",
              i === 0 && (isAgent ? "rounded-tr-md" : "rounded-tl-md")
            )}
          >
            {msg.content}
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
          <Clock className="size-2.5" />
          {msgTime(group.items[group.items.length - 1].createdAt)}
        </span>
      </div>
      {isAgent && (
        <Avatar className="size-7 mb-1 shrink-0">
          <AvatarFallback className="bg-fuchsia-500 text-white text-[10px] font-semibold">
            <Headphones className="size-3.5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-2 items-end justify-start">
      <Avatar className="size-7 mb-1 shrink-0">
        <AvatarFallback className="bg-violet-500 text-white text-[10px] font-semibold">
          <Bot className="size-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-bl-sm bg-violet-100 dark:bg-violet-500/15 px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="typing-dot size-1.5 rounded-full bg-violet-500" />
          <span className="typing-dot size-1.5 rounded-full bg-violet-500" />
          <span className="typing-dot size-1.5 rounded-full bg-violet-500" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty / Loading states ───────────────────────────────────────
function ListSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyList() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16 px-6">
      <Search className="size-8 mb-3 opacity-40" />
      <p className="text-sm font-medium">No conversations found</p>
      <p className="text-xs mt-1">
        Try adjusting your search or filter.
      </p>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />
        <div className="relative size-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
          <MessageSquare className="size-10 text-white" />
        </div>
      </div>
      <h3 className="text-lg font-semibold">Select a conversation</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Choose a conversation from the list to view messages, take over from
        the AI, and reply to your visitors in real time.
      </p>
      <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Circle className="size-2 fill-violet-500 text-violet-500" /> AI
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span className="inline-flex items-center gap-1.5">
          <Circle className="size-2 fill-emerald-500 text-emerald-500" /> Human
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span className="inline-flex items-center gap-1.5">
          <Circle className="size-2 fill-muted-foreground text-muted-foreground" /> Closed
        </span>
      </div>
    </div>
  );
}
