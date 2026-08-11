"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Bot, Send, Minus, MessageSquare, AlertCircle } from "lucide-react";
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
};

const VISITOR_ID_KEY = "replyai_visitor_id";

function getOrCreateVisitorId(): string {
  // Only ever runs in the browser (this is a "use client" component),
  // but guard for SSR just in case.
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
    // localStorage may be disabled (private mode) — fall back to a random id.
    return "v-" + Math.random().toString(36).slice(2, 12);
  }
}

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
  const [minimized, setMinimized] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorIdRef = useRef<string>("");

  // Generate / load a stable visitorId once on mount.
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();
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
  }, [messages, sending, minimized]);

  // Refocus input after sending.
  useEffect(() => {
    if (!minimized && !sending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [sending, minimized]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || !config || paused) return;

    const visitorMsg: ChatMsg = {
      id: "v-" + Date.now(),
      role: "VISITOR",
      content: text,
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
        }),
      });
      const data = await res.json();
      const reply: ChatMsg = {
        id: "a-" + Date.now(),
        role: "AI",
        content:
          (data && data.reply) ||
          "Sorry, I didn't quite catch that. Could you rephrase?",
      };
      setMessages((prev) => [...prev, reply]);
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

  const primaryColor = config?.primaryColor || "#8b5cf6";
  const botName = config?.name || "Assistant";

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
  if (minimized) {
    return (
      <div
        className="h-screen w-full flex items-end justify-end p-4 bg-transparent"
        style={{ ["--bot-color" as string]: primaryColor }}
      >
        <button
          onClick={() => setMinimized(false)}
          aria-label="Open chat"
          className="h-14 w-14 rounded-full bg-[var(--bot-color)] text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      </div>
    );
  }

  // ---------- Active chat state ----------
  return (
    <div
      className="h-screen w-full bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 flex items-stretch sm:items-center sm:justify-center sm:p-4"
      style={{ ["--bot-color" as string]: primaryColor }}
    >
      <div className="flex flex-col w-full h-full sm:max-w-md sm:h-[640px] sm:max-h-[90vh] sm:rounded-2xl bg-card sm:shadow-2xl overflow-hidden border sm:border-border">
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
            onClick={() => setMinimized(true)}
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
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} primaryColor={primaryColor} />
          ))}

          {sending && (
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/70" />
                <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/70" />
                <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/70" />
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t bg-card p-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            disabled={sending}
            className="flex-1 h-11 rounded-full bg-muted px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--bot-color)] focus:bg-background transition-all placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            onClick={handleSend}
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
      </div>
    </div>
  );
}

function Bubble({
  msg,
  primaryColor,
}: {
  msg: ChatMsg;
  primaryColor: string;
}) {
  const isVisitor = msg.role === "VISITOR";
  return (
    <div
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
      <div
        className={cn(
          "max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
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
    </div>
  );
}
