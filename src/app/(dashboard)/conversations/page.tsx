"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Socket } from "socket.io-client";
import { connectRealtime, isRealtimeEnabled } from "@/lib/realtime";
import { formatDistanceToNow, format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { type DateRange } from "react-day-picker";
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
  Sparkles,
  FileText,
  Wand2,
  Zap,
  ChevronDown,
  Star,
  Download,
  Inbox,
  AlertTriangle,
  UserCheck,
  SquareCheck,
  Square,
  Calendar,
  Filter,
  Trash2,
  Eye,
  CheckSquare,
  Globe,
  Code,
  Command,
  Tag as TagIcon,
  Plus,
  Pencil,
  Settings2,
  ChevronsUpDown,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  channel: string;
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
  assignedAgent: { id: string; name: string; email: string } | null;
  channel: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  chatbot: { id: string; name: string };
  visitor: {
    totalConversations: number;
    totalMessages: number;
    firstSeen: string;
  };
  tags: ConversationTagInfo[];
};

// ─── Tags ────────────────────────────────────────────────────────
type TagColor = "violet" | "emerald" | "amber" | "fuchsia" | "rose" | "sky";

type OrgTag = {
  id: string;
  name: string;
  color: TagColor;
  conversations: number;
  createdAt: string;
};

type ConversationTagInfo = {
  id: string;
  name: string;
  color: TagColor;
  assignedAt?: string;
};

const TAG_COLORS: TagColor[] = [
  "violet",
  "emerald",
  "amber",
  "fuchsia",
  "rose",
  "sky",
];

function tagBadgeClass(color: string): string {
  switch (color) {
    case "violet":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-violet-200 dark:border-violet-500/30";
    case "emerald":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30";
    case "amber":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30";
    case "fuchsia":
      return "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/30";
    case "rose":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30";
    case "sky":
      return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function tagDotClass(color: string): string {
  switch (color) {
    case "violet": return "bg-violet-500";
    case "emerald": return "bg-emerald-500";
    case "amber": return "bg-amber-500";
    case "fuchsia": return "bg-fuchsia-500";
    case "rose": return "bg-rose-500";
    case "sky": return "bg-sky-500";
    default: return "bg-muted-foreground";
  }
}

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
// Uses the centralized helper in @/lib/realtime which gracefully
// degrades to polling when no socket.io server is available (e.g. Vercel).
function getSocket(): Socket | null {
  if (!isRealtimeEnabled()) return null;
  return connectRealtime();
}

// ─── Component ────────────────────────────────────────────────────
type Tab = "ALL" | "AI" | "HUMAN" | "CLOSED" | "NEEDS_ATTENTION";

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

  // AI Summary
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // AI Reply Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Canned responses
  const [canned, setCanned] = useState<
    { id: string; title: string; content: string; shortcut: string | null }[]
  >([]);
  const [cannedOpen, setCannedOpen] = useState(false);

  // Team members (for Assign dropdown)
  const [members, setMembers] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([]);

  // Visitor info panel toggle
  const [showVisitorPanel, setShowVisitorPanel] = useState(false);

  // Bulk selection
  const [selectedConvos, setSelectedConvos] = useState<Set<string>>(new Set());
  const toggleConvoSelect = useCallback((id: string) => {
    setSelectedConvos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedConvos(new Set()), []);

  // ─── Enhanced Filters ────────────────────────────────────────────
  // Date range filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePreset, setDatePreset] = useState<"all" | "7d" | "30d" | "custom">("all");

  // Multi-status filter (replaces single tab for status, but tab still controls needs_attention)
  const [statusFilters, setStatusFilters] = useState<Set<ConvStatus>>(new Set());

  // Channel filter
  const [channelFilters, setChannelFilters] = useState<Set<string>>(new Set());

  // Satisfaction filter
  const [satisfactionFilter, setSatisfactionFilter] = useState<"all" | "rated" | "unrated" | "high" | "low">("all");

  // Bulk delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ─── Tags state ──────────────────────────────────────────────────
  const [orgTags, setOrgTags] = useState<OrgTag[]>([]);
  const [tagsPanelOpen, setTagsPanelOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDialogMode, setTagDialogMode] = useState<"create" | "edit">("create");
  const [tagDialogId, setTagDialogId] = useState<string | null>(null);
  const [tagDialogName, setTagDialogName] = useState("");
  const [tagDialogColor, setTagDialogColor] = useState<TagColor>("violet");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagDeleteId, setTagDeleteId] = useState<string | null>(null);
  const [tagTogglingId, setTagTogglingId] = useState<string | null>(null);

  // Search ref for ⌘F shortcut
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounced search (300ms)
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (datePreset !== "all") count++;
    if (statusFilters.size > 0) count++;
    if (channelFilters.size > 0) count++;
    if (satisfactionFilter !== "all") count++;
    if (search.trim()) count++;
    if (tab !== "ALL") count++;
    return count;
  }, [datePreset, statusFilters, channelFilters, satisfactionFilter, search, tab]);

  // Socket ref
  const socketRef = useRef<Socket | null>(null);

  // Unread tracking (conversationId -> count) — simplified: mark unread when a
  // visitor message arrives for a non-selected conversation.
  const [unread, setUnread] = useState<Record<string, number>>({});

  // ─── Fetch list ────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
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
  }, [debouncedSearch]);

  // Debounce search + refetch
  useEffect(() => {
    setLoadingList(true);
    const t = setTimeout(() => {
      void fetchList();
    }, 300);
    return () => clearTimeout(t);
  }, [debouncedSearch, fetchList]);

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
    if (!socket) return; // realtime disabled — polling fallback handles updates

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
      setSummary(null);
      setSuggestions([]);
      setShowSummary(false);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setMessages([]);
    setDetail(null);
    setSummary(null);
    setShowSummary(false);
    setSuggestions([]);
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
        if (data.conversation?.summary) {
          setSummary(data.conversation.summary);
        }
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
    const c = { ALL: conversations.length, AI: 0, HUMAN: 0, CLOSED: 0, NEEDS_ATTENTION: 0 };
    for (const conv of conversations) {
      if (conv.status === "AI") c.AI++;
      else if (conv.status === "HUMAN") c.HUMAN++;
      else if (conv.status === "CLOSED") c.CLOSED++;
      // Needs attention = HUMAN + unassigned
      if (conv.status === "HUMAN" && !conv.assignedToId) c.NEEDS_ATTENTION++;
    }
    return c;
  }, [conversations]);

  // Filtered conversations for display — enhanced with all filters
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Tab filter (needs attention)
    if (tab === "NEEDS_ATTENTION") {
      filtered = filtered.filter((c) => c.status === "HUMAN" && !c.assignedToId);
    }

    // Multi-status filter
    if (statusFilters.size > 0 && tab !== "NEEDS_ATTENTION") {
      filtered = filtered.filter((c) => statusFilters.has(c.status));
    }

    // Channel filter
    if (channelFilters.size > 0) {
      filtered = filtered.filter((c) => channelFilters.has(c.channel));
    }

    // Satisfaction filter
    if (satisfactionFilter !== "all") {
      filtered = filtered.filter((c) => {
        switch (satisfactionFilter) {
          case "rated": return c.satisfaction !== null;
          case "unrated": return c.satisfaction === null;
          case "high": return c.satisfaction !== null && c.satisfaction >= 4;
          case "low": return c.satisfaction !== null && c.satisfaction <= 2;
          default: return true;
        }
      });
    }

    // Date range filter
    if (datePreset !== "all" && dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      filtered = filtered.filter((c) => {
        try {
          return isWithinInterval(new Date(c.updatedAt), { start: from, end: to });
        } catch {
          return false;
        }
      });
    } else if (datePreset === "7d") {
      const from = subDays(new Date(), 7);
      filtered = filtered.filter((c) => {
        try { return new Date(c.updatedAt) >= from; } catch { return false; }
      });
    } else if (datePreset === "30d") {
      const from = subDays(new Date(), 30);
      filtered = filtered.filter((c) => {
        try { return new Date(c.updatedAt) >= from; } catch { return false; }
      });
    }

    // Client-side search across visitor name, email, and message content
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const name = (c.visitorName || "").toLowerCase();
        const email = (c.visitorEmail || "").toLowerCase();
        const msg = (c.lastMessage?.content || "").toLowerCase();
        return name.includes(q) || email.includes(q) || msg.includes(q);
      });
    }

    return filtered;
  }, [conversations, tab, statusFilters, channelFilters, satisfactionFilter, datePreset, dateRange, debouncedSearch]);

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

  // ─── AI: Generate conversation summary ──────────────────────────
  const generateSummary = useCallback(async () => {
    if (!selectedId || loadingSummary) return;
    setLoadingSummary(true);
    setShowSummary(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/summary`, {
        method: "POST",
      });
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      /* ignore */
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedId, loadingSummary]);

  // ─── AI: Generate reply suggestions ─────────────────────────────
  const loadSuggestions = useCallback(async () => {
    if (!selectedId || loadingSuggestions) return;
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/suggestions`, {
        method: "POST",
      });
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoadingSuggestions(false);
    }
  }, [selectedId, loadingSuggestions]);

  // ─── Canned responses ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/canned-responses");
        if (res.ok) {
          const data = await res.json();
          setCanned(data.responses ?? []);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // ─── Team members (for Assign dropdown) ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setMembers(data.org?.users ?? []);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Auto-load suggestions when conversation changes (if there are messages)
  useEffect(() => {
    if (selectedId && messages.length > 0 && suggestions.length === 0) {
      void loadSuggestions();
    }
  }, [selectedId, messages.length, suggestions.length, loadSuggestions]);

  // ─── Tags: fetch org tags on mount ──────────────────────────────
  const fetchOrgTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setOrgTags(data.tags ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void fetchOrgTags();
  }, [fetchOrgTags]);

  // ─── Tags: open create dialog ───────────────────────────────────
  const openCreateTagDialog = useCallback(() => {
    setTagDialogMode("create");
    setTagDialogId(null);
    setTagDialogName("");
    setTagDialogColor("violet");
    setTagDialogOpen(true);
  }, []);

  // ─── Tags: open edit dialog ─────────────────────────────────────
  const openEditTagDialog = useCallback((tag: OrgTag) => {
    setTagDialogMode("edit");
    setTagDialogId(tag.id);
    setTagDialogName(tag.name);
    setTagDialogColor(tag.color);
    setTagDialogOpen(true);
  }, []);

  // ─── Tags: save (create or update) ──────────────────────────────
  const saveTag = useCallback(async () => {
    const name = tagDialogName.trim();
    if (!name) {
      toast.error("Tag name is required");
      return;
    }
    if (tagSaving) return;
    setTagSaving(true);
    try {
      const isEdit = tagDialogMode === "edit" && tagDialogId;
      const res = await fetch(
        isEdit ? `/api/tags/${tagDialogId}` : "/api/tags",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color: tagDialogColor }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Failed to save tag");
        return;
      }
      const data = await res.json();
      const saved: OrgTag = {
        id: data.tag.id,
        name: data.tag.name,
        color: data.tag.color,
        conversations: data.tag.conversations ?? 0,
        createdAt: data.tag.createdAt,
      };
      setOrgTags((prev) => {
        if (isEdit) {
          return prev.map((t) => (t.id === saved.id ? saved : t));
        }
        const exists = prev.some((t) => t.id === saved.id);
        if (exists) return prev.map((t) => (t.id === saved.id ? saved : t));
        return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
      });
      // If editing, also update detail tags in case the conversation has it.
      setDetail((d) => {
        if (!d) return d;
        return {
          ...d,
          tags: d.tags.map((t) =>
            t.id === saved.id
              ? { id: saved.id, name: saved.name, color: saved.color, assignedAt: t.assignedAt }
              : t
          ),
        };
      });
      toast.success(isEdit ? "Tag updated" : "Tag created");
      setTagDialogOpen(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setTagSaving(false);
    }
  }, [tagDialogId, tagDialogMode, tagDialogName, tagDialogColor, tagSaving]);

  // ─── Tags: delete ───────────────────────────────────────────────
  const deleteTag = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          toast.error(data?.error ?? "Failed to delete tag");
          return;
        }
        setOrgTags((prev) => prev.filter((t) => t.id !== id));
        setDetail((d) => (d ? { ...d, tags: d.tags.filter((t) => t.id !== id) } : d));
        toast.success("Tag deleted");
        setTagDeleteId(null);
      } catch {
        toast.error("Something went wrong");
      }
    },
    []
  );

  // ─── Tags: toggle a tag on the selected conversation ────────────
  const toggleConversationTag = useCallback(
    async (tagId: string, currentlyAttached: boolean) => {
      if (!selectedId || tagTogglingId) return;
      setTagTogglingId(tagId);
      const tag = orgTags.find((t) => t.id === tagId);
      // Optimistic update
      setDetail((d) => {
        if (!d) return d;
        if (currentlyAttached) {
          return { ...d, tags: d.tags.filter((t) => t.id !== tagId) };
        }
        if (!tag || d.tags.some((t) => t.id === tagId)) return d;
        return {
          ...d,
          tags: [...d.tags, { id: tag.id, name: tag.name, color: tag.color }],
        };
      });
      try {
        const res = await fetch(`/api/conversations/${selectedId}/tags`, {
          method: currentlyAttached ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagId }),
        });
        if (!res.ok) {
          // Revert on failure
          setDetail((d) => {
            if (!d || !tag) return d;
            if (currentlyAttached) {
              return {
                ...d,
                tags: [
                  ...d.tags,
                  { id: tag.id, name: tag.name, color: tag.color },
                ],
              };
            }
            return { ...d, tags: d.tags.filter((t) => t.id !== tagId) };
          });
          toast.error("Failed to update tags");
          return;
        }
        // Update conversation counts on org tags
        setOrgTags((prev) =>
          prev.map((t) =>
            t.id === tagId
              ? {
                  ...t,
                  conversations: Math.max(
                    0,
                    t.conversations + (currentlyAttached ? -1 : 1)
                  ),
                }
              : t
          )
        );
      } catch {
        toast.error("Something went wrong");
      } finally {
        setTagTogglingId(null);
      }
    },
    [selectedId, orgTags, tagTogglingId]
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  const handleBack = () => setMobileView("list");

  // ─── ⌘F keyboard shortcut ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.open("/api/conversations/export", "_blank");
              }}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        {/* ─── Tags management (collapsible) ─────────────────────── */}
        <Collapsible
          open={tagsPanelOpen}
          onOpenChange={setTagsPanelOpen}
          className="rounded-xl border bg-card overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2.5">
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                aria-label="Toggle tags panel"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-200/60 dark:border-violet-700/30">
                  <TagIcon className="size-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-sm font-medium">Tags</span>
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {orgTags.length}
                </Badge>
                <ChevronsUpDown className="size-3.5 text-muted-foreground ml-1" />
              </button>
            </CollapsibleTrigger>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={openCreateTagDialog}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Create tag</span>
            </Button>
          </div>
          <CollapsibleContent>
            <div className="border-t px-4 py-3">
              {orgTags.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-6">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-200/60 dark:border-violet-700/30 flex items-center justify-center mb-2">
                    <TagIcon className="size-5 text-violet-500 dark:text-violet-400" />
                  </div>
                  <p className="text-sm font-medium">No tags yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Use tags to categorize conversations — by topic, priority,
                    sentiment, or anything else your team needs.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={openCreateTagDialog}
                  >
                    <Plus className="size-3.5" />
                    Create your first tag
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {orgTags.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                        tagBadgeClass(t.color)
                      )}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          tagDotClass(t.color)
                        )}
                      />
                      <span className="font-medium">{t.name}</span>
                      <span className="opacity-70 tabular-nums">
                        {t.conversations}
                      </span>
                      <span className="inline-flex items-center gap-0.5 ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditTagDialog(t)}
                          className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                          aria-label={`Edit ${t.name}`}
                          title="Edit"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          onClick={() => setTagDeleteId(t.id)}
                          className="rounded p-0.5 hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-300"
                          aria-label={`Delete ${t.name}`}
                          title="Delete"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Split pane */}
        <div className="flex flex-1 min-h-0 gap-4">
          {/* ─── Left panel: list ─────────────────────────────── */}
          <aside
            className={cn(
              "flex flex-col w-full md:w-80 lg:w-96 shrink-0 rounded-xl border bg-card overflow-hidden",
              mobileView === "detail" ? "hidden md:flex" : "flex"
            )}
          >
            {/* Search + ⌘F shortcut */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); searchInputRef.current?.blur(); } }}
                  placeholder="Search name, email, messages…"
                  className="pl-8 pr-16 bg-background"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex items-center gap-0.5 rounded border border-muted-foreground/20 bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                  <Command className="size-2.5" />F
                </kbd>
              </div>
            </div>

            {/* ⌘F global shortcut */}
            {/* (handled via effect below) */}

            {/* Filter bar: Tabs + Filter dropdowns */}
            <div className="px-2 py-2 border-b space-y-2">
              {/* Tab row */}
              <div className="flex items-center gap-1 overflow-x-auto scroll-thin">
                {(
                  [
                    { key: "ALL", label: "All", count: counts.ALL },
                    { key: "AI", label: "AI", count: counts.AI },
                    { key: "HUMAN", label: "Human", count: counts.HUMAN },
                    { key: "NEEDS_ATTENTION", label: "Needs attention", count: counts.NEEDS_ATTENTION },
                    { key: "CLOSED", label: "Closed", count: counts.CLOSED },
                  ] as { key: Tab; label: string; count: number }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTab(t.key);
                      // When selecting a tab, also set status filter to match (for ALL, clear)
                      if (t.key === "ALL" || t.key === "NEEDS_ATTENTION") {
                        setStatusFilters(new Set());
                      } else {
                        setStatusFilters(new Set([t.key as ConvStatus]));
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                      (tab === t.key || (t.key !== "ALL" && t.key !== "NEEDS_ATTENTION" && statusFilters.has(t.key as ConvStatus) && tab !== "NEEDS_ATTENTION"))
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {t.key === "NEEDS_ATTENTION" && <AlertTriangle className="size-3" />}
                    {t.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                        (tab === t.key || (t.key !== "ALL" && t.key !== "NEEDS_ATTENTION" && statusFilters.has(t.key as ConvStatus)))
                          ? "bg-primary-foreground/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Filter dropdowns row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Status multi-filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                      <Filter className="size-3" />
                      Status
                      {statusFilters.size > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{statusFilters.size}</Badge>
                      )}
                      <ChevronDown className="size-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(["AI", "HUMAN", "CLOSED"] as ConvStatus[]).map((s) => (
                      <DropdownMenuCheckboxItem
                        key={s}
                        checked={statusFilters.has(s)}
                        onCheckedChange={(checked) => {
                          setStatusFilters((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(s);
                            else next.delete(s);
                            return next;
                          });
                        }}
                        onSelect={(e) => e.preventDefault()}
                        className="text-xs"
                      >
                        {statusLabel(s)}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Channel filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                      <Globe className="size-3" />
                      Channel
                      {channelFilters.size > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{channelFilters.size}</Badge>
                      )}
                      <ChevronDown className="size-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuLabel className="text-xs">Channel</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(["WIDGET", "API"] as string[]).map((ch) => (
                      <DropdownMenuCheckboxItem
                        key={ch}
                        checked={channelFilters.has(ch)}
                        onCheckedChange={(checked) => {
                          setChannelFilters((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(ch);
                            else next.delete(ch);
                            return next;
                          });
                        }}
                        onSelect={(e) => e.preventDefault()}
                        className="text-xs"
                      >
                        {ch === "WIDGET" ? <Globe className="size-3 mr-2" /> : <Code className="size-3 mr-2" />}
                        {ch}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Satisfaction filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("gap-1.5 h-7 text-xs", satisfactionFilter !== "all" && "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300")}
                    >
                      <Star className="size-3" />
                      Satisfaction
                      {satisfactionFilter !== "all" && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">1</Badge>
                      )}
                      <ChevronDown className="size-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuLabel className="text-xs">Satisfaction</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {([
                      { key: "all", label: "All" },
                      { key: "rated", label: "Rated" },
                      { key: "unrated", label: "Unrated" },
                      { key: "high", label: "High (4-5)" },
                      { key: "low", label: "Low (1-2)" },
                    ] as { key: typeof satisfactionFilter; label: string }[]).map((opt) => (
                      <DropdownMenuItem
                        key={opt.key}
                        onClick={() => setSatisfactionFilter(opt.key)}
                        className={cn("text-xs", satisfactionFilter === opt.key && "bg-accent")}
                      >
                        {satisfactionFilter === opt.key && <Check className="size-3 mr-2" />}
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Date range filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("gap-1.5 h-7 text-xs", datePreset !== "all" && "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300")}
                    >
                      <Calendar className="size-3" />
                      {datePreset === "all" ? "Date" : datePreset === "7d" ? "7 days" : datePreset === "30d" ? "30 days" : "Custom"}
                      <ChevronDown className="size-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <div className="p-3 space-y-3">
                      <div className="flex items-center gap-1.5">
                        {(["7d", "30d"] as const).map((p) => (
                          <Button
                            key={p}
                            variant={datePreset === p ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => {
                              setDatePreset(p);
                              setDateRange(undefined);
                            }}
                          >
                            {p === "7d" ? "Last 7 days" : "Last 30 days"}
                          </Button>
                        ))}
                        <Button
                          variant={datePreset === "custom" ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => setDatePreset("custom")}
                        >
                          Custom
                        </Button>
                      </div>
                      {datePreset === "custom" && (
                        <CalendarPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => {
                            setDateRange(range);
                            if (range?.from) setDatePreset("custom");
                          }}
                          numberOfMonths={1}
                          className="rounded-md border"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            setDatePreset("all");
                            setDateRange(undefined);
                          }}
                        >
                          Clear
                        </Button>
                        {datePreset === "custom" && dateRange?.from && (
                          <span className="text-xs text-muted-foreground">
                            {format(dateRange.from, "MMM d, yyyy")}
                            {dateRange.to && ` – ${format(dateRange.to, "MMM d, yyyy")}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Active filter count */}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 text-[10px] gap-1">
                    {activeFilterCount} active
                    <button
                      className="ml-0.5 hover:text-destructive"
                      onClick={() => {
                        setSearch("");
                        setTab("ALL");
                        setStatusFilters(new Set());
                        setChannelFilters(new Set());
                        setSatisfactionFilter("all");
                        setDatePreset("all");
                        setDateRange(undefined);
                      }}
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>

            {/* Conversation count */}
            <div className="px-3 py-1.5 border-b bg-muted/30">
              <span className="text-[10px] text-muted-foreground">
                {filteredConversations.length} conversation{filteredConversations.length !== 1 ? "s" : ""}
                {selectedConvos.size > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    · {selectedConvos.size} selected
                  </span>
                )}
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto scroll-thin">
              {loadingList && filteredConversations.length === 0 ? (
                <ListSkeleton />
              ) : filteredConversations.length === 0 ? (
                <EmptyList
                  onClearFilters={() => {
                    setSearch("");
                    setTab("ALL");
                    setStatusFilters(new Set());
                    setChannelFilters(new Set());
                    setSatisfactionFilter("all");
                    setDatePreset("all");
                    setDateRange(undefined);
                  }}
                  hasFilters={activeFilterCount > 0}
                />
              ) : (
                <ul className="divide-y">
                  {filteredConversations.map((conv) => {
                    const name = conv.visitorName || conv.visitorEmail || "Visitor";
                    const isUnread = (unread[conv.id] ?? 0) > 0;
                    const isSelected = conv.id === selectedId;
                    const isChecked = selectedConvos.has(conv.id);
                    // Search highlight helper
                    const highlightText = (text: string) => {
                      if (!debouncedSearch.trim()) return text;
                      const q = debouncedSearch.trim();
                      const idx = text.toLowerCase().indexOf(q.toLowerCase());
                      if (idx === -1) return text;
                      return (
                        <>
                          {text.slice(0, idx)}
                          <mark className="bg-amber-200/60 dark:bg-amber-500/30 rounded-sm px-0.5">
                            {text.slice(idx, idx + q.length)}
                          </mark>
                          {text.slice(idx + q.length)}
                        </>
                      );
                    };
                    return (
                      <li key={conv.id}>
                        <button
                          onClick={() => handleSelect(conv.id)}
                          className={cn(
                            "w-full flex items-start gap-3 px-3 py-3 text-left transition-all group relative",
                            isSelected
                              ? "bg-accent/60 border-l-2 border-l-violet-500"
                              : isChecked
                                ? "bg-primary/5 border-l-2 border-l-primary/40"
                                : "hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-violet-300"
                          )}
                        >
                          {/* Checkbox */}
                          <span
                            className="mt-1 shrink-0"
                            onClick={(e) => { e.stopPropagation(); toggleConvoSelect(conv.id); }}
                          >
                            {isChecked ? (
                              <SquareCheck className="size-4 text-primary" />
                            ) : (
                              <Square className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                            )}
                          </span>
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
                                {highlightText(name)}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0" title={conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleString() : new Date(conv.updatedAt).toLocaleString()}>
                                {conv.lastMessage
                                  ? timeAgo(conv.lastMessage.createdAt)
                                  : timeAgo(conv.updatedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="flex-1 truncate text-xs text-muted-foreground">
                                {conv.lastMessage
                                  ? highlightText(conv.lastMessage.content)
                                  : "No messages yet"}
                              </p>
                              {isUnread && (
                                <span className="size-2 rounded-full bg-violet-500 shrink-0 animate-glow-pulse" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {/* Channel icon */}
                              {conv.channel === "WIDGET" ? (
                                <Globe className="size-3 text-muted-foreground/60" />
                              ) : (
                                <Code className="size-3 text-muted-foreground/60" />
                              )}
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
                              {/* Satisfaction star */}
                              {conv.satisfaction !== null && conv.satisfaction > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                                  <Star className="size-2.5 fill-amber-500" />
                                  {conv.satisfaction}
                                </span>
                              )}
                              {/* Glow dot for HUMAN conversations needing attention */}
                              {conv.status === "HUMAN" && !conv.assignedToId && (
                                <span className="size-2 rounded-full bg-violet-500 shrink-0 animate-glow-pulse" title="Needs attention" />
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
                        <div className="flex items-center gap-2 flex-wrap">
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
                          {detail.tags.map((t) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-4 gap-1",
                                tagBadgeClass(t.color)
                              )}
                              title={t.name}
                            >
                              <Hash className="size-2.5" />
                              {t.name}
                            </Badge>
                          ))}
                          {/* Add tag dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                              >
                                <TagIcon className="size-3" />
                                <span className="hidden sm:inline">Add tag</span>
                                <Plus className="size-2.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-60">
                              <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
                                <TagIcon className="size-3.5" />
                                Tags
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <div className="max-h-60 overflow-y-auto scroll-thin">
                                {orgTags.length === 0 ? (
                                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                                    No tags yet.
                                    <br />
                                    Create one to get started.
                                  </div>
                                ) : (
                                  orgTags.map((t) => {
                                    const attached = detail.tags.some(
                                      (ct) => ct.id === t.id
                                    );
                                    return (
                                      <DropdownMenuCheckboxItem
                                        key={t.id}
                                        checked={attached}
                                        disabled={tagTogglingId === t.id}
                                        onCheckedChange={() =>
                                          void toggleConversationTag(
                                            t.id,
                                            attached
                                          )
                                        }
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-xs gap-2"
                                      >
                                        <span
                                          className={cn(
                                            "size-2.5 rounded-full shrink-0",
                                            tagDotClass(t.color)
                                          )}
                                        />
                                        <span className="truncate flex-1">
                                          {t.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {t.conversations}
                                        </span>
                                      </DropdownMenuCheckboxItem>
                                    );
                                  })
                                )}
                              </div>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setTagsPanelOpen(true);
                                  openCreateTagDialog();
                                }}
                                className="text-xs gap-2"
                              >
                                <Plus className="size-3.5" />
                                Create new tag
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setTagsPanelOpen(true)}
                                className="text-xs gap-2"
                              >
                                <Settings2 className="size-3.5" />
                                Manage tags
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {detail.visitorEmail || detail.visitorId}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (summary && showSummary) {
                                  setShowSummary(false);
                                } else if (summary) {
                                  setShowSummary(true);
                                } else {
                                  void generateSummary();
                                }
                              }}
                              disabled={loadingSummary}
                              className={cn(
                                "gap-1.5",
                                showSummary &&
                                  "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                              )}
                            >
                              {loadingSummary ? (
                                <Clock className="size-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="size-3.5" />
                              )}
                              <span className="hidden sm:inline">
                                {loadingSummary
                                  ? "Summarizing…"
                                  : summary
                                  ? showSummary
                                    ? "Hide summary"
                                    : "Show summary"
                                  : "AI Summary"}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Generate an AI summary of this conversation
                          </TooltipContent>
                        </Tooltip>
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
                        {/* Visitor info toggle */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "size-8",
                                showVisitorPanel &&
                                  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                              )}
                              onClick={() => setShowVisitorPanel((v) => !v)}
                            >
                              <UserIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Visitor info</TooltipContent>
                        </Tooltip>
                        {/* Assign dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-60">
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
                            {members.map((m) => (
                              <DropdownMenuItem
                                key={m.id}
                                onClick={() =>
                                  void patchConversation({
                                    assignedToId: m.id,
                                  })
                                }
                                className={cn(
                                  detail.assignedToId === m.id &&
                                    "bg-violet-50 dark:bg-violet-950/30"
                                )}
                              >
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[9px] font-semibold mr-2">
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate">{m.name}</span>
                                {detail.assignedToId === m.id && (
                                  <Check className="size-3 ml-auto text-violet-600" />
                                )}
                              </DropdownMenuItem>
                            ))}
                            {members.length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                No team members yet
                              </div>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Channel</DropdownMenuLabel>
                            <DropdownMenuItem disabled>
                              <MessageSquare className="size-3.5 mr-2" />
                              {detail.channel}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  ) : null}
                </header>

                {/* AI Summary panel */}
                {showSummary && detail && (
                  <div className="border-b bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-4 py-3">
                    <div className="max-w-2xl mx-auto">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                          <Sparkles className="size-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-violet-900 dark:text-violet-100">
                          AI Summary
                        </span>
                        <button
                          onClick={() => setShowSummary(false)}
                          className="ml-auto text-violet-400 hover:text-violet-600 dark:hover:text-violet-200"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      {loadingSummary ? (
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-5/6" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      ) : (
                        <p className="text-xs text-violet-900/80 dark:text-violet-100/80 leading-relaxed">
                          {summary}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages + Visitor panel row */}
                <div className="flex-1 flex min-h-0">
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
                <div className="border-t p-3 bg-card space-y-2">
                  {/* AI Reply Suggestions */}
                  {detail && detail.status !== "CLOSED" && messages.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Wand2 className="size-3 text-violet-500" />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          AI suggested replies
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-violet-600 hover:text-violet-700"
                          onClick={() => void loadSuggestions()}
                          disabled={loadingSuggestions}
                        >
                          {loadingSuggestions ? (
                            <>
                              <Clock className="size-3 mr-1 animate-spin" /> Thinking…
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3 mr-1" /> Refresh
                            </>
                          )}
                        </Button>
                      </div>
                      {loadingSuggestions && suggestions.length === 0 ? (
                        <div className="flex gap-2">
                          {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-8 flex-1 rounded-lg" />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => setDraft(s)}
                              className="group flex items-start gap-1.5 rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 px-2.5 py-1.5 text-left text-xs text-violet-900 dark:text-violet-100 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors max-w-full"
                            >
                              <Sparkles className="size-3 mt-0.5 shrink-0 text-violet-500 opacity-60 group-hover:opacity-100" />
                              <span className="line-clamp-2 flex-1">{s}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    {/* Canned responses dropdown */}
                    {detail && detail.status !== "CLOSED" && canned.length > 0 && (
                      <DropdownMenu open={cannedOpen} onOpenChange={setCannedOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-10 shrink-0"
                            aria-label="Quick replies"
                          >
                            <Zap className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72">
                          <DropdownMenuLabel className="flex items-center gap-2">
                            <Zap className="size-3.5" /> Quick replies
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <div className="max-h-72 overflow-y-auto scroll-thin">
                            {canned.map((c) => (
                              <DropdownMenuItem
                                key={c.id}
                                onClick={() => {
                                  setDraft(c.content);
                                  setCannedOpen(false);
                                }}
                                className="flex-col items-start gap-0.5 py-2"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-xs font-medium">{c.title}</span>
                                  {c.shortcut && (
                                    <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1 font-mono">
                                      {c.shortcut}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground line-clamp-1">
                                  {c.content}
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder={
                        detail?.status === "CLOSED"
                          ? "This conversation is closed"
                          : "Type your reply… (⌘+Enter to send)"
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
                        : "⌘+Enter to send"}
                    </span>
                    <div className="flex items-center gap-3">
                      {detail && (
                        <span className="text-[10px] text-muted-foreground">
                          {messages.length} messages
                        </span>
                      )}
                      {draft.length > 0 && (
                        <span className={cn(
                          "text-[10px] font-mono",
                          draft.length > 800 ? "text-amber-500" : "text-muted-foreground"
                        )}>
                          {draft.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visitor info panel (inside flex row, beside messages) */}
                {showVisitorPanel && detail && (
                  <aside className="hidden lg:flex w-72 shrink-0 border-l bg-card flex-col overflow-y-auto scroll-thin">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <span className="text-sm font-semibold">Visitor info</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setShowVisitorPanel(false)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                    <div className="p-4 space-y-5">
                      {/* Avatar + identity */}
                      <div className="flex flex-col items-center text-center pb-4 border-b">
                        <Avatar className="size-16 mb-2">
                          <AvatarFallback
                            className={cn(
                              "text-white text-lg font-semibold",
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
                        <div className="text-sm font-medium">
                          {detail.visitorName || "Anonymous Visitor"}
                        </div>
                        {detail.visitorEmail && (
                          <div className="text-xs text-muted-foreground truncate w-full mt-0.5">
                            {detail.visitorEmail}
                          </div>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4 mt-2",
                            statusBadgeClass(detail.status)
                          )}
                        >
                          {statusLabel(detail.status)}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border p-2.5 text-center">
                          <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                            {detail.visitor?.totalConversations ?? 1}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Conversations
                          </div>
                        </div>
                        <div className="rounded-lg border p-2.5 text-center">
                          <div className="text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400">
                            {detail.visitor?.totalMessages ?? messages.length}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Messages
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-start gap-2">
                          <Clock className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <div className="text-muted-foreground">First seen</div>
                            <div className="font-medium">
                              {timeAgo(detail.visitor?.firstSeen || detail.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MessageSquare className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <div className="text-muted-foreground">Channel</div>
                            <div className="font-medium">{detail.channel}</div>
                          </div>
                        </div>
                        {detail.assignedAgent && (
                          <div className="flex items-start gap-2">
                            <Headphones className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <div className="text-muted-foreground">Assigned to</div>
                              <div className="font-medium">{detail.assignedAgent.name}</div>
                            </div>
                          </div>
                        )}
                        {detail.satisfaction !== null && (
                          <div className="flex items-start gap-2">
                            <Star className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-muted-foreground">Satisfaction</div>
                              <div className="font-medium">
                                {detail.satisfaction}/5
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Visitor ID */}
                      <div className="pt-3 border-t">
                        <div className="text-[10px] text-muted-foreground mb-1">
                          Visitor ID
                        </div>
                        <code className="text-[10px] bg-muted px-2 py-1 rounded block break-all">
                          {detail.visitorId}
                        </code>
                      </div>
                    </div>
                  </aside>
                )}

                {/* Mobile visitor panel (Sheet/Drawer) */}
                <Sheet open={showVisitorPanel && !!detail} onOpenChange={setShowVisitorPanel}>
                  <SheetContent side="right" className="w-80 p-0 lg:hidden">
                    <SheetHeader className="px-4 py-3 border-b">
                      <SheetTitle className="text-sm">Visitor info</SheetTitle>
                    </SheetHeader>
                    {detail && (
                      <div className="p-4 space-y-5 overflow-y-auto scroll-thin">
                        {/* Avatar + identity */}
                        <div className="flex flex-col items-center text-center pb-4 border-b">
                          <Avatar className="size-16 mb-2">
                            <AvatarFallback
                              className={cn(
                                "text-white text-lg font-semibold",
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
                          <div className="text-sm font-medium">
                            {detail.visitorName || "Anonymous Visitor"}
                          </div>
                          {detail.visitorEmail && (
                            <div className="text-xs text-muted-foreground truncate w-full mt-0.5">
                              {detail.visitorEmail}
                            </div>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 mt-2",
                              statusBadgeClass(detail.status)
                            )}
                          >
                            {statusLabel(detail.status)}
                          </Badge>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border p-2.5 text-center">
                            <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                              {detail.visitor?.totalConversations ?? 1}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Conversations
                            </div>
                          </div>
                          <div className="rounded-lg border p-2.5 text-center">
                            <div className="text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400">
                              {detail.visitor?.totalMessages ?? messages.length}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Messages
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-start gap-2">
                            <Clock className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <div className="text-muted-foreground">First seen</div>
                              <div className="font-medium">
                                {timeAgo(detail.visitor?.firstSeen || detail.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MessageSquare className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <div className="text-muted-foreground">Channel</div>
                              <div className="font-medium">{detail.channel}</div>
                            </div>
                          </div>
                          {detail.assignedAgent && (
                            <div className="flex items-start gap-2">
                              <Headphones className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                <div className="text-muted-foreground">Assigned to</div>
                                <div className="font-medium">{detail.assignedAgent.name}</div>
                              </div>
                            </div>
                          )}
                          {detail.satisfaction !== null && (
                            <div className="flex items-start gap-2">
                              <Star className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-muted-foreground">Satisfaction</div>
                                <div className="font-medium">
                                  {detail.satisfaction}/5
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Visitor ID */}
                        <div className="pt-3 border-t">
                          <div className="text-[10px] text-muted-foreground mb-1">
                            Visitor ID
                          </div>
                          <code className="text-[10px] bg-muted px-2 py-1 rounded block break-all">
                            {detail.visitorId}
                          </code>
                        </div>
                      </div>
                    )}
                  </SheetContent>
                </Sheet>
                </div>
                {/* /Messages + Visitor panel row */}
              </>
            )}
          </section>
        </div>

        {/* Bulk actions bar */}
        <AnimatePresence>
          {selectedConvos.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border bg-card shadow-2xl px-4 py-2.5"
            >
              <Badge variant="secondary" className="gap-1.5 h-6">
                <CheckSquare className="size-3" />
                {selectedConvos.size} selected
              </Badge>
              <Separator orientation="vertical" className="h-6" />
              {/* Select all / deselect all */}
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 h-7 text-xs"
                onClick={() => {
                  if (selectedConvos.size === filteredConversations.length) {
                    clearSelection();
                  } else {
                    setSelectedConvos(new Set(filteredConversations.map((c) => c.id)));
                  }
                }}
              >
                {selectedConvos.size === filteredConversations.length ? (
                  <>
                    <Square className="size-3" />
                    Deselect all
                  </>
                ) : (
                  <>
                    <CheckSquare className="size-3" />
                    Select all
                  </>
                )}
              </Button>
              <Separator orientation="vertical" className="h-6" />
              {/* Close all */}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs"
                onClick={async () => {
                  const ids = [...selectedConvos];
                  await Promise.allSettled(
                    ids.map((id) =>
                      fetch(`/api/conversations/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "CLOSED" }),
                      })
                    )
                  );
                  // Optimistically update local state
                  setConversations((prev) =>
                    prev.map((c) => ids.includes(c.id) ? { ...c, status: "CLOSED" as ConvStatus } : c)
                  );
                  clearSelection();
                }}
              >
                <X className="size-3" />
                Close all
              </Button>
              {/* Assign to dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                    <Users className="size-3" />
                    Assign to
                    <ChevronDown className="size-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel className="text-xs">Assign to</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      const ids = [...selectedConvos];
                      await Promise.allSettled(
                        ids.map((id) =>
                          fetch(`/api/conversations/${id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ assignedToId: null }),
                          })
                        )
                      );
                      setConversations((prev) =>
                        prev.map((c) => ids.includes(c.id) ? { ...c, assignedToId: null } : c)
                      );
                      clearSelection();
                    }}
                  >
                    <UserIcon className="size-3.5 mr-2" />
                    Unassign
                  </DropdownMenuItem>
                  {members.map((m) => (
                    <DropdownMenuItem
                      key={m.id}
                      onClick={async () => {
                        const ids = [...selectedConvos];
                        await Promise.allSettled(
                          ids.map((id) =>
                            fetch(`/api/conversations/${id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ assignedToId: m.id, status: "HUMAN" }),
                            })
                          )
                        );
                        setConversations((prev) =>
                          prev.map((c) =>
                            ids.includes(c.id)
                              ? { ...c, assignedToId: m.id, status: "HUMAN" as ConvStatus }
                              : c
                          )
                        );
                        clearSelection();
                      }}
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[9px] font-semibold mr-2">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{m.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Mark as read */}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs"
                onClick={() => {
                  setUnread((prev) => {
                    const next = { ...prev };
                    for (const id of selectedConvos) {
                      delete next[id];
                    }
                    return next;
                  });
                  clearSelection();
                }}
              >
                <Eye className="size-3" />
                Mark as read
              </Button>
              {/* Delete with confirmation */}
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 h-7 text-xs"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="size-3" />
                Delete
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={clearSelection}
              >
                Cancel
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedConvos.size} conversation{selectedConvos.size !== 1 ? "s" : ""}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The selected conversations and all their messages will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  const ids = [...selectedConvos];
                  await Promise.allSettled(
                    ids.map((id) =>
                      fetch(`/api/conversations/${id}`, {
                        method: "DELETE",
                      })
                    )
                  );
                  setConversations((prev) => prev.filter((c) => !ids.includes(c.id)));
                  clearSelection();
                  setShowDeleteDialog(false);
                  // If the currently selected conversation was deleted, deselect it
                  if (selectedId && ids.includes(selectedId)) {
                    setSelectedId(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Tag create/edit dialog */}
        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TagIcon className="size-4 text-violet-500" />
                {tagDialogMode === "edit" ? "Edit tag" : "Create tag"}
              </DialogTitle>
              <DialogDescription>
                {tagDialogMode === "edit"
                  ? "Update the name or color of this tag."
                  : "Add a new tag to categorize your conversations."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="tag-name" className="text-xs">Name</Label>
                <Input
                  id="tag-name"
                  value={tagDialogName}
                  onChange={(e) => setTagDialogName(e.target.value)}
                  placeholder="e.g. VIP, Refund, Bug, Sales"
                  maxLength={40}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveTag();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTagDialogColor(c)}
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-background transition-all",
                        tagDotClass(c),
                        tagDialogColor === c
                          ? "ring-foreground"
                          : "ring-transparent hover:ring-muted-foreground/40"
                      )}
                      aria-label={c}
                      title={c}
                    >
                      {tagDialogColor === c && (
                        <Check className="size-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-xs">Preview</Label>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2 py-0.5 h-5 gap-1",
                      tagBadgeClass(tagDialogColor)
                    )}
                  >
                    <Hash className="size-3" />
                    {tagDialogName.trim() || "Tag name"}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTagDialogOpen(false)}
                disabled={tagSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void saveTag()}
                disabled={tagSaving || !tagDialogName.trim()}
                className="gap-1.5"
              >
                {tagSaving ? (
                  <Clock className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {tagDialogMode === "edit" ? "Save changes" : "Create tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tag delete confirmation */}
        <AlertDialog
          open={!!tagDeleteId}
          onOpenChange={(o) => !o && setTagDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this tag?</AlertDialogTitle>
              <AlertDialogDescription>
                The tag will be removed from all conversations it&apos;s
                currently attached to. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (tagDeleteId) void deleteTag(tagDeleteId);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
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
          </motion.div>
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

function EmptyList({ onClearFilters, hasFilters }: { onClearFilters: () => void; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16 px-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-violet-500/10 blur-2xl rounded-full" />
        <div className="relative size-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center border border-violet-200/50 dark:border-violet-700/30">
          <Inbox className="size-8 opacity-50" />
        </div>
      </div>
      <p className="text-sm font-medium">No conversations found</p>
      <p className="text-xs mt-1 max-w-[220px] leading-relaxed">
        {hasFilters
          ? "Try adjusting your search or filter to find what you're looking for."
          : "Conversations will appear here when visitors start chatting with your chatbot."}
      </p>
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5"
          onClick={onClearFilters}
        >
          <X className="size-3" />
          Clear all filters
        </Button>
      )}
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
