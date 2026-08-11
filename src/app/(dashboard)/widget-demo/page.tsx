"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot,
  Code2,
  Copy,
  Check,
  Palette,
  Smartphone,
  MessageSquare,
  Sparkles,
  Rocket,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Chatbot = {
  id: string;
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  status: string;
  position: string;
};

const COLOR_SWATCHES = [
  { name: "Violet", value: "#8b5cf6" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Teal", value: "#14b8a6" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
];

const STEPS = [
  {
    icon: Code2,
    title: "Copy the embed snippet",
    desc: "Grab the one-line script tag below. It works on any site — WordPress, Shopify, Webflow, or your own codebase.",
  },
  {
    icon: Palette,
    title: "Match your brand",
    desc: "Pick a color and position. Your bot's personality, welcome message, and knowledge base live in the AI Chatbot tab.",
  },
  {
    icon: MessageSquare,
    title: "Talk to your customers",
    desc: "Visitors chat in real time. The AI resolves 80% instantly and hands the rest to your human inbox with full context.",
  },
];

export default function WidgetDemoPage() {
  const [bot, setBot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [origin, setOrigin] = useState("");

  // For the visual customization preview.
  const [selectedColor, setSelectedColor] = useState<string>("#8b5cf6");
  const [selectedPosition, setSelectedPosition] = useState<string>("bottom-right");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chatbot");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        // The chatbot API might return either a single bot or { chatbot: ... };
        // handle both shapes defensively.
        const botData: Chatbot | null = data?.id
          ? data
          : data?.chatbot?.id
            ? data.chatbot
            : Array.isArray(data) && data[0]?.id
              ? data[0]
              : null;
        if (botData) {
          setBot(botData);
          setSelectedColor(botData.primaryColor || "#8b5cf6");
          setSelectedPosition(botData.position || "bottom-right");
        } else {
          setError("No chatbot found for your organization.");
        }
      } catch (e) {
        console.error("[widget-demo] failed to load chatbot", e);
        if (!cancelled) setError("Failed to load your chatbot config.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const embedCode = bot
    ? `<!-- ReplyAI Widget -->
<script src="${origin}/widget.js" data-bot-id="${bot.id}" async></script>`
    : "";

  async function copyEmbed() {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("clipboard copy failed", e);
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Widget
            </Badge>
            <span className="text-xs text-muted-foreground">
              Embeddable chat widget
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Your AI widget, ready to embed
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Drop one line of code on your site and your AI support agent goes
            live instantly. Customize the color, position, and personality to
            match your brand.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* LEFT: explanation + embed code */}
          <div className="space-y-6">
            {/* Embed code card */}
            <Card className="overflow-hidden border-violet-200/60 dark:border-violet-900/40">
              <CardHeader className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  Embed code
                </CardTitle>
                <CardDescription>
                  Paste this snippet just before the closing{" "}
                  <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">
                    &lt;/body&gt;
                  </code>{" "}
                  tag on any page where you want the widget to appear.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {loading ? (
                  <div className="h-24 rounded-lg bg-muted animate-pulse" />
                ) : error ? (
                  <div className="text-sm text-destructive">{error}</div>
                ) : (
                  <>
                    <pre className="text-xs leading-relaxed bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto font-mono scroll-thin">
                      {embedCode}
                    </pre>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={copyEmbed}
                            disabled={!embedCode}
                            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90"
                          >
                            {copied ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy snippet
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {copied ? "Copied to clipboard" : "Copy to clipboard"}
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs text-muted-foreground">
                        No build step required
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Rocket className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
                  How it works
                </CardTitle>
                <CardDescription>
                  From sign-up to live chat in under five minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border-2 border-violet-300 dark:border-violet-700 text-[10px] font-bold flex items-center justify-center text-violet-700 dark:text-violet-300">
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="text-sm font-semibold">{s.title}</div>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: live preview iframe */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Smartphone className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    Live preview
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setIframeKey((k) => k + 1)}
                        disabled={!bot}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reload
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh the widget preview</TooltipContent>
                  </Tooltip>
                </div>
                <CardDescription>
                  This is the actual widget your visitors will see. Try chatting!
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center bg-gradient-to-br from-violet-50/60 to-fuchsia-50/60 dark:from-violet-950/20 dark:to-fuchsia-950/20 py-6">
                {loading ? (
                  <div className="h-[560px] w-[380px] max-w-full rounded-[2rem] border-8 border-gray-800 bg-muted animate-pulse" />
                ) : bot ? (
                  <div className="relative">
                    {/* Phone mockup */}
                    <div className="relative w-[380px] max-w-[88vw] h-[560px] max-h-[70vh] rounded-[2rem] border-8 border-gray-800 dark:border-gray-900 shadow-2xl overflow-hidden bg-white">
                      {/* notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 h-5 w-28 bg-gray-800 dark:bg-gray-900 rounded-b-2xl" />
                      {bot.status === "PAUSED" ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 gap-2">
                          <Bot className="h-10 w-10 text-muted-foreground" />
                          <div className="text-sm font-semibold">
                            Bot is paused
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Activate the bot in the AI Chatbot tab to preview.
                          </p>
                        </div>
                      ) : (
                        <iframe
                          key={iframeKey}
                          src={`/widget/${bot.id}`}
                          title="ReplyAI Widget Preview"
                          className="block h-full w-full bg-white"
                          allow="clipboard-write"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-[560px] w-[380px] max-w-full rounded-[2rem] border-8 border-gray-800 bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    {error || "No chatbot available."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customization section (visual only) */}
        <Separator />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
              Customization
            </CardTitle>
            <CardDescription>
              Visual preview of available options. Edit the live values in the{" "}
              <span className="font-medium text-foreground">AI Chatbot</span>{" "}
              tab.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-8">
            {/* Color swatches */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Accent color</div>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_SWATCHES.map((c) => {
                  const active = selectedColor.toLowerCase() === c.value.toLowerCase();
                  return (
                    <Tooltip key={c.value}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedColor(c.value)}
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center transition-all hover:scale-110",
                            active
                              ? "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                              : "ring-1 ring-border"
                          )}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.name}
                        >
                          {active && (
                            <Check className="h-4 w-4 text-white drop-shadow" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{c.name}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div
                  className="h-8 w-8 rounded-md ring-1 ring-border"
                  style={{ backgroundColor: selectedColor }}
                />
                <code className="text-xs font-mono text-muted-foreground">
                  {selectedColor}
                </code>
              </div>
            </div>

            {/* Position options */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Widget position</div>
              <div className="grid grid-cols-2 gap-2.5">
                {POSITIONS.map((p) => {
                  const active = selectedPosition === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => setSelectedPosition(p.value)}
                      className={cn(
                        "relative h-24 rounded-lg border-2 transition-all overflow-hidden",
                        active
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                          : "border-border bg-muted/40 hover:border-violet-300"
                      )}
                    >
                      <div className="absolute inset-0 p-2">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Screen
                        </div>
                      </div>
                      <div
                        className={cn(
                          "absolute h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md",
                          p.value === "bottom-right"
                            ? "bottom-2 right-2"
                            : "bottom-2 left-2"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute bottom-1 text-[10px] font-medium",
                          p.value === "bottom-right"
                            ? "right-9"
                            : "left-9"
                        )}
                      >
                        {p.label}
                      </div>
                      {active && (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-violet-600 text-white flex items-center justify-center">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats / value props */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Bot,
              title: "AI-powered",
              desc: "Trained on your knowledge base & FAQs.",
              color: "from-violet-500 to-purple-600",
            },
            {
              icon: MessageSquare,
              title: "Real-time",
              desc: "Sub-2-second responses, 24/7.",
              color: "from-fuchsia-500 to-pink-600",
            },
            {
              icon: Rocket,
              title: "1-line install",
              desc: "No SDK. No build step. Just paste & go.",
              color: "from-rose-500 to-orange-500",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-4 flex items-start gap-3">
                <div
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-md",
                    f.color
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{f.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {f.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
