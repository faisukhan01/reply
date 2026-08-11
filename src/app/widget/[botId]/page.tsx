"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Minus, MessageSquare, AlertCircle, Star, Heart, Headphones, DollarSign, Clock, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type WidgetConfig = {
  id: string;
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  status: string;
  position?: string;
};

type ChatMsg = {
  id: string;
  role: "VISITOR" | "AI";
  content: string;
  timestamp?: number;
  read?: boolean;
};

const VISITOR_ID_KEY = "replyai_visitor_id";
const VISITOR_NAME_KEY = "replyai_visitor_name";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") {
    return "v-" + Math.random().toString(36).slice(2, 12);
  }
  try {
    let id = window.localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id =
        "v-" +
        Math.random().toString(36).slice(2, 12) +
        Date.now().toString(36);
      window.localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return "v-" + Math.random().toString(36).slice(2, 12);
  }
}

function getStoredVisitorName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(VISITOR_NAME_KEY) || "";
  } catch {
    return "";
  }
}

function storeVisitorName(name: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISITOR_NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

const QUICK_ACTIONS = [
  { label: "Pricing", message: "I'd like to know about pricing", icon: DollarSign },
  { label: "Hours", message: "What are your business hours?", icon: Clock },
  { label: "Talk to human", message: "I'd like to speak with a human agent", icon: Headphones },
];

export default function WidgetPage() {
  const params = useParams<{ botId: string }>();
  const botId = params?.botId;

  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [paused, setPaused] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);

  // Visitor name flow
  const [visitorName, setVisitorName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorIdRef = useRef<string>("");

  // Generate / load a stable visitorId once on mount.
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();
    const stored = getStoredVisitorName();
    if (stored) {
      setVisitorName(stored);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  // Fetch the bot's public config.
  useEffect(() => {
    if (!botId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/widget?botId=${botId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "PAUSED") {
          setPaused(true);
        } else if (data.id) {
          setConfig(data);
          setMessages([
            {
              id: "welcome",
              role: "AI",
              content:
                data.welcomeMessage ||
                "Hi! How can I help you today?",
              timestamp: Date.now(),
              read: true,
            },
          ]);
        } else {
          setNotFound(true);
        }
      } catch (e) {
        console.error("[widget] config fetch failed", e);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [botId]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, widgetOpen]);

  // Refocus input after sending.
  useEffect(() => {
    if (widgetOpen && !sending && inputRef.current && !showNamePrompt) {
      inputRef.current.focus();
    }
  }, [sending, widgetOpen, showNamePrompt]);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending || !config || paused) return;

    const now = Date.now();
    const visitorMsg: ChatMsg = {
      id: "v-" + now,
      role: "VISITOR",
      content: text,
      timestamp: now,
      read: false,
    };
    setMessages((prev) => [...prev, visitorMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/widget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId,
          visitorId: visitorIdRef.current,
          message: text,
          visitorName: visitorName || undefined,
        }),
      });
      const data = await res.json();
      const replyTime = Date.now();
      const reply: ChatMsg = {
        id: "a-" + replyTime,
        role: "AI",
        content:
          (data && data.reply) ||
          "Sorry, I didn't quite catch that. Could you rephrase?",
        timestamp: replyTime,
        read: true,
      };
      // Mark previous visitor messages as read
      setMessages((prev) =>
        prev.map((m) => (m.role === "VISITOR" && !m.read ? { ...m, read: true } : m))
      );
      setMessages((prev) => [...prev, reply]);
      if (data?.conversationId) {
        setConversationId(data.conversationId);
      }
      // Show survey after 3+ visitor messages (meaningful conversation)
      const visitorMsgCount = messages.filter((m) => m.role === "VISITOR").length;
      if (visitorMsgCount >= 2 && !surveySubmitted) {
        setTimeout(() => setShowSurvey(true), 1500);
      }
    } catch (e) {
      console.error("[widget] send failed", e);
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "AI",
          content:
            "Connection error. Please check your internet and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSubmitName() {
    const name = nameInput.trim();
    if (!name) return;
    setVisitorName(name);
    storeVisitorName(name);
    setShowNamePrompt(false);
    setNameInput("");
  }

  async function submitRating(rating: number) {
    setSelectedRating(rating);
    setSurveySubmitted(true);
    setShowSurvey(false);
    if (conversationId) {
      try {
        await fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ satisfaction: rating }),
        });
      } catch {
        /* ignore */
      }
    }
    setMessages((prev) => [
      ...prev,
      {
        id: "sys-" + Date.now(),
        role: "AI",
        content:
          rating >= 4
            ? "Thank you so much for your feedback! I'm glad I could help. Have a wonderful day! ✨"
            : "Thank you for the feedback. I'll share this with our team so we can improve. Is there anything else I can help with?",
      },
    ]);
  }

  const primaryColor = config?.primaryColor || "#8b5cf6";
  const botName = config?.name || "Assistant";
  const hasQuickActions = messages.length <= 1 && !sending;

  // ---------- States: loading / paused / not-found ----------
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading assistant…</p>
        </div>
      </div>
    );
  }

  if (paused) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-6">
        <div className="text-center max-w-xs space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-base font-semibold">Assistant is offline</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our assistant has been temporarily paused. Please try again later or
            email support and we&apos;ll get back to you.
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-6">
        <div className="text-center max-w-xs space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-base font-semibold">Assistant not found</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We couldn&apos;t find this assistant. Please check the embed code or
            contact the site owner.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Minimized state ----------
  if (!widgetOpen) {
    const hasMessages = messages.length > 1;
    return (
      <div
        className="h-screen w-full flex items-end justify-end p-4 bg-transparent"
        style={{ ["--bot-color" as string]: primaryColor }}
      >
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setWidgetOpen(true)}
          aria-label="Open chat"
          className="relative h-14 w-14 rounded-full bg-[var(--bot-color)] text-white shadow-2xl flex items-center justify-center"
        >
          <MessageSquare className="h-6 w-6" />
          {hasMessages && (
            <>
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-rose-500 text-[9px] font-bold items-center justify-center">
                  {messages.filter(m => m.role === "AI" && m.id !== "welcome").length}
                </span>
              </span>
              <span className="absolute inset-0 rounded-full animate-glow-pulse" />
            </>
          )}
        </motion.button>
      </div>
    );
  }

  // ---------- Active chat state ----------
  return (
    <div
      className="h-screen w-full bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 flex items-stretch sm:items-center sm:justify-center sm:p-4"
      style={{ ["--bot-color" as string]: primaryColor }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex flex-col w-full h-full sm:max-w-md sm:h-[640px] sm:max-h-[90vh] sm:rounded-2xl bg-card sm:shadow-2xl overflow-hidden border sm:border-border"
      >
        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 py-3 text-white shrink-0 bg-[var(--bot-color)]"
          style={{
            backgroundImage: `linear-gradient(135deg, var(--bot-color), color-mix(in srgb, var(--bot-color) 70%, #000))`,
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-2 ring-white/30 shrink-0">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{botName}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/85">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Online · replies instantly
            </div>
          </div>
          <button
            onClick={() => setWidgetOpen(false)}
            aria-label="Minimize chat"
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
          >
            <Minus className="h-4 w-4" />
          </button>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scroll-thin px-4 py-4 space-y-3 bg-gradient-to-b from-background to-muted/30"
        >
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} primaryColor={primaryColor} />
            ))}
          </AnimatePresence>

          {/* Quick actions */}
          <AnimatePresence>
            {hasQuickActions && !showNamePrompt && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap gap-2 pt-2"
              >
                {QUICK_ACTIONS.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <motion.button
                      key={action.label}
                      onClick={() => handleSend(action.message)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white transition-all hover:shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <ActionIcon className="h-3 w-3" />
                      {action.label}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end gap-2"
            >
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/70" />
                <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/70" />
                <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/70" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Visitor name prompt */}
        <AnimatePresence>
          {showNamePrompt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-t bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-4 py-3 overflow-hidden"
            >
              <div className="text-center">
                <div className="text-sm font-medium text-violet-900 dark:text-violet-100 mb-2">
                  Hi! What&apos;s your name?
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitName();
                    }}
                    placeholder="Your name"
                    className="flex-1 h-9 rounded-full bg-white dark:bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-violet-400 transition-all placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <button
                    onClick={handleSubmitName}
                    disabled={!nameInput.trim()}
                    className="h-9 px-4 rounded-full text-white text-sm font-medium transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Go
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Satisfaction survey */}
        <AnimatePresence>
          {showSurvey && !surveySubmitted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-t bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-4 py-3 overflow-hidden"
            >
              <div className="text-center">
                <div className="text-xs font-medium text-violet-900 dark:text-violet-100 mb-1.5">
                  Rate this conversation
                </div>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => submitRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="star-interactive p-0.5"
                      aria-label={`Rate ${n} stars`}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          n <= (hoverRating || selectedRating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-amber-300 hover:text-amber-400"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowSurvey(false)}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-1.5"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Survey thank you (animated heart) */}
        <AnimatePresence>
          {surveySubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="shrink-0 border-t bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-4 py-2 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
                className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-300"
              >
                <Heart className="size-4 fill-violet-500 text-violet-500" />
                Thank you!
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Composer */}
        {!showNamePrompt && (
          <div className="shrink-0 border-t bg-card p-3 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={visitorName ? `Type your message, ${visitorName}…` : "Type your message…"}
              disabled={sending}
              className="flex-1 h-11 rounded-full bg-muted px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--bot-color)] focus:bg-background transition-all placeholder:text-muted-foreground disabled:opacity-60"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center text-white shrink-0 transition-all",
                "bg-[var(--bot-color)] hover:opacity-90 active:scale-95",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Powered-by footer */}
        <div className="shrink-0 bg-card px-4 py-2 text-center border-t">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by{" "}
            <span className="font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              ReplyAI
            </span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

function formatMsgTime(ts?: number): string {
  if (!ts) return "";
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function Bubble({
  msg,
  primaryColor,
  showTimestamp,
}: {
  msg: ChatMsg;
  primaryColor: string;
  showTimestamp?: boolean;
}) {
  const isVisitor = msg.role === "VISITOR";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex items-end gap-2",
        isVisitor ? "justify-end" : "justify-start"
      )}
    >
      {!isVisitor && (
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={cn("max-w-[78%]", isVisitor ? "flex flex-col items-end" : "flex flex-col items-start")}>
        <div
          className={cn(
            "px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
            isVisitor
              ? "text-white rounded-2xl rounded-br-md"
              : "bg-muted text-foreground rounded-2xl rounded-bl-md"
          )}
          style={
            isVisitor
              ? { backgroundColor: primaryColor }
              : undefined
          }
        >
          {msg.content}
        </div>
        {/* Timestamp + Read receipt */}
        {(showTimestamp || msg.timestamp) && (
          <div className={cn(
            "flex items-center gap-1 mt-0.5 px-1",
            isVisitor ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="text-[10px] text-muted-foreground/70">
              {formatMsgTime(msg.timestamp)}
            </span>
            {isVisitor && (
              <span className="text-muted-foreground/50">
                {msg.read ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
