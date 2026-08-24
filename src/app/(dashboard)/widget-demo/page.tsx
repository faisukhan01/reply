"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Chatbot = {
  id: string;
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  status: string;
  position: string;
  persona?: string;
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

const PERSONAS = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "concise", label: "Concise" },
  { value: "playful", label: "Playful" },
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
  const [copySuccess, setCopySuccess] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [origin, setOrigin] = useState("");

  // Customization state
  const [selectedColor, setSelectedColor] = useState<string>("#8b5cf6");
  const [selectedPosition, setSelectedPosition] = useState<string>("bottom-right");
  const [customName, setCustomName] = useState<string>("");
  const [customWelcome, setCustomWelcome] = useState<string>("");
  const [customPersona, setCustomPersona] = useState<string>("friendly");

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
          setCustomName(botData.name || "");
          setCustomWelcome(botData.welcomeMessage || "");
          setCustomPersona(botData.persona || "friendly");
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

  // Generate embed code that updates with customization
  const embedCode = useMemo(() => {
    if (!bot) return "";
    const attrs: string[] = [
      `data-bot-id="${bot.id}"`,
    ];
    if (selectedColor !== bot.primaryColor) {
      attrs.push(`data-color="${selectedColor}"`);
    }
    if (selectedPosition !== "bottom-right") {
      attrs.push(`data-position="${selectedPosition}"`);
    }
    return `<!-- ReplyAI Widget -->
<script src="${origin}/widget.js" ${attrs.join(" ")} async></script>`;
  }, [bot, origin, selectedColor, selectedPosition]);

  async function copyEmbed() {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setCopySuccess(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setCopySuccess(false), 3000);
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
              className="bg-muted text-muted-foreground border-transparent"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Widget
            </Badge>
            <span className="text-xs text-muted-foreground">
              Embeddable chat widget
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Your AI widget, ready to embed
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Drop one line of code on your site and your AI support agent goes
            live instantly. Customize the color, position, and personality to
            match your brand.
          </p>
        </div>

        {/* Main grid: customization panel | live preview */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* LEFT: Customization panel */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
              <CardHeader className="bg-muted/40">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  Customize
                </CardTitle>
                <CardDescription>
                  Tweak the widget appearance and see changes live.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {/* Primary color */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Accent color</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_SWATCHES.map((c) => {
                      const active = selectedColor.toLowerCase() === c.value.toLowerCase();
                      return (
                        <Tooltip key={c.value}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setSelectedColor(c.value)}
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-110",
                                active
                                  ? "ring-2 ring-offset-2 ring-offset-background ring-foreground"
                                  : "ring-1 ring-border"
                              )}
                              style={{ backgroundColor: c.value }}
                              aria-label={c.name}
                            >
                              {active && (
                                <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{c.name}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="h-8 w-12 cursor-pointer p-0.5"
                      aria-label="Custom color"
                    />
                    <Input
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="h-8 w-24 font-mono text-xs"
                      maxLength={7}
                      aria-label="Color hex"
                    />
                  </div>
                </div>

                {/* Bot name */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Bot name</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Support Bot"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Welcome message */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Welcome message</Label>
                  <Textarea
                    value={customWelcome}
                    onChange={(e) => setCustomWelcome(e.target.value)}
                    placeholder="Hi! How can I help you today?"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Persona */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Persona</Label>
                  <Select value={customPersona} onValueChange={setCustomPersona}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONAS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Position</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {POSITIONS.map((p) => {
                      const active = selectedPosition === p.value;
                      return (
                        <button
                          key={p.value}
                          onClick={() => setSelectedPosition(p.value)}
                          className={cn(
                            "relative h-16 rounded-lg border-2 transition-all overflow-hidden",
                            active
                              ? "border-foreground bg-muted"
                              : "border-border bg-muted/40 hover:border-foreground/40"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute h-4 w-4 rounded-full bg-foreground",
                              p.value === "bottom-right"
                                ? "bottom-1.5 right-1.5"
                                : "bottom-1.5 left-1.5"
                            )}
                          />
                          <div className="absolute top-1.5 left-1.5 text-[9px] font-medium text-muted-foreground">
                            {p.label}
                          </div>
                          {active && (
                            <div className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-foreground text-background flex items-center justify-center">
                              <Check className="h-2 w-2" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Code snippet card */}
            <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                  Embed code
                </CardTitle>
                <CardDescription>
                  Paste before{" "}
                  <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">
                    &lt;/body&gt;
                  </code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="h-20 rounded-lg bg-muted animate-pulse" />
                ) : error ? (
                  <div className="text-sm text-destructive">{error}</div>
                ) : (
                  <>
                    <pre className="text-[11px] leading-relaxed bg-zinc-950 text-zinc-100 rounded-lg p-3 overflow-x-auto font-mono scroll-thin">
                      {embedCode}
                    </pre>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={copyEmbed}
                        disabled={!embedCode}
                        size="sm"
                        className={cn(
                          "gap-1.5 transition-all",
                          copySuccess
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-foreground text-background hover:bg-foreground/90"
                        )}
                      >
                        <AnimatePresence mode="wait">
                          {copied ? (
                            <motion.span
                              key="check"
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 15 }}
                              className="flex items-center"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Copied!
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center"
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copy snippet
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: live preview iframe - spans 2 cols */}
          <div className="space-y-4 lg:col-span-2 lg:sticky lg:top-6">
            <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    Live preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                      <a href={bot ? `/widget/${bot.id}` : "#"} target="_blank" rel="noopener">
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </a>
                    </Button>
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
                </div>
                <CardDescription>
                  This is the actual widget your visitors will see. Try chatting!
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center bg-muted/40 py-6">
                {loading ? (
                  <div className="h-[560px] w-[380px] max-w-full rounded-[2rem] border-8 border-gray-800 bg-muted animate-pulse" />
                ) : bot ? (
                  <div className="relative">
                    {/* Phone mockup */}
                    <div className="relative w-[380px] max-w-[88vw] h-[560px] max-h-[70vh] rounded-[2rem] border-8 border-gray-800 dark:border-gray-900 overflow-hidden bg-white">
                      {/* notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 h-5 w-28 bg-gray-800 dark:bg-gray-900 rounded-b-lg" />
                      {/* Customization preview overlay */}
                      <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
                        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: selectedColor }}>
                          <div className="px-3 py-2 flex items-center gap-2 text-white">
                            <div className="size-6 rounded-full bg-white/20 flex items-center justify-center">
                              <Bot className="size-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{customName || bot.name}</div>
                              <div className="text-[10px] text-white/70 capitalize">{customPersona}</div>
                            </div>
                          </div>
                          <div className="bg-white p-2 space-y-2">
                            <div className="flex items-start gap-1.5">
                              <div className="size-4 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: selectedColor }}>
                                <Bot className="size-2.5" />
                              </div>
                              <div className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] text-gray-700 max-w-[85%]">
                                {customWelcome || bot.welcomeMessage || "Hi! How can I help you today?"}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-400">
                                Type a message…
                              </div>
                              <div className="size-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: selectedColor }}>
                                <MessageSquare className="size-2.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
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

        {/* How it works */}
        <Separator />
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Rocket className="h-4 w-4 text-muted-foreground" />
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
                    <div className="h-10 w-10 rounded-lg border bg-muted text-muted-foreground flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-medium tabular-nums flex items-center justify-center">
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

        {/* Quick stats / value props */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Bot,
              title: "AI-powered",
              desc: "Trained on your knowledge base & FAQs.",
            },
            {
              icon: MessageSquare,
              title: "Real-time",
              desc: "Sub-2-second responses, 24/7.",
            },
            {
              icon: Rocket,
              title: "1-line install",
              desc: "No SDK. No build step. Just paste & go.",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-4 flex items-start gap-3 rounded-lg border bg-card shadow-none">
                <div className="h-10 w-10 shrink-0 rounded-lg border bg-muted text-muted-foreground flex items-center justify-center">
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
