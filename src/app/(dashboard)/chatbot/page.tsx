"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Bot,
  MessageSquare,
  FileText,
  HelpCircle,
  Code2,
  Plus,
  Trash2,
  Copy,
  Check,
  Palette,
  Save,
  Send,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Types ───────────────────────────────────────────────────────
type KnowledgeDoc = {
  id: string;
  chatbotId: string;
  title: string;
  content: string;
  sourceType: string;
  createdAt: string;
};

type FAQ = {
  id: string;
  chatbotId: string;
  question: string;
  answer: string;
  createdAt: string;
};

type Chatbot = {
  id: string;
  orgId: string;
  name: string;
  welcomeMessage: string;
  persona: string;
  systemPrompt: string | null;
  primaryColor: string;
  status: string;
  knowledge: KnowledgeDoc[];
  faqs: FAQ[];
  createdAt: string;
  updatedAt: string;
};

const PERSONAS: Record<string, { label: string; description: string }> = {
  friendly: {
    label: "Friendly",
    description: "Warm, approachable, uses occasional emojis.",
  },
  professional: {
    label: "Professional",
    description: "Clear, polite, business-appropriate tone.",
  },
  concise: {
    label: "Concise",
    description: "Answers in as few words as possible.",
  },
  playful: {
    label: "Playful",
    description: "Fun, humorous, uses emojis generously.",
  },
};

const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Fuchsia", hex: "#d946ef" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
];

// ─── Page ────────────────────────────────────────────────────────
export default function ChatbotBuilderPage() {
  const [chatbot, setChatbot] = React.useState<Chatbot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("config");

  const loadChatbot = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chatbot", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load chatbot");
      const data = await res.json();
      setChatbot(data.chatbot as Chatbot);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load your chatbot. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadChatbot();
  }, [loadChatbot]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Bot className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Chatbot Builder
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure your AI assistant, train it on your knowledge base, and
          embed it anywhere.
        </p>
      </header>

      {loading || !chatbot ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-fit">
            <TabsTrigger value="config" className="gap-1.5">
              <Bot className="size-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5">
              <FileText className="size-4" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-1.5">
              <HelpCircle className="size-4" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="embed" className="gap-1.5">
              <Code2 className="size-4" />
              Embed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-6">
            <ConfigurationTab chatbot={chatbot} onUpdate={setChatbot} />
          </TabsContent>
          <TabsContent value="knowledge" className="mt-6">
            <KnowledgeTab chatbot={chatbot} onChange={loadChatbot} />
          </TabsContent>
          <TabsContent value="faqs" className="mt-6">
            <FaqsTab chatbot={chatbot} onChange={loadChatbot} />
          </TabsContent>
          <TabsContent value="embed" className="mt-6">
            <EmbedTab chatbot={chatbot} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Tab 1: Configuration ────────────────────────────────────────
function ConfigurationTab({
  chatbot,
  onUpdate,
}: {
  chatbot: Chatbot;
  onUpdate: (c: Chatbot) => void;
}) {
  const [name, setName] = React.useState(chatbot.name);
  const [welcomeMessage, setWelcomeMessage] = React.useState(
    chatbot.welcomeMessage
  );
  const [persona, setPersona] = React.useState(chatbot.persona);
  const [systemPrompt, setSystemPrompt] = React.useState(
    chatbot.systemPrompt ?? ""
  );
  const [primaryColor, setPrimaryColor] = React.useState(chatbot.primaryColor);
  const [status, setStatus] = React.useState(chatbot.status);
  const [saving, setSaving] = React.useState(false);

  // Sync if chatbot is reloaded externally.
  React.useEffect(() => {
    setName(chatbot.name);
    setWelcomeMessage(chatbot.welcomeMessage);
    setPersona(chatbot.persona);
    setSystemPrompt(chatbot.systemPrompt ?? "");
    setPrimaryColor(chatbot.primaryColor);
    setStatus(chatbot.status);
  }, [chatbot]);

  const dirty =
    name !== chatbot.name ||
    welcomeMessage !== chatbot.welcomeMessage ||
    persona !== chatbot.persona ||
    (systemPrompt ?? "") !== (chatbot.systemPrompt ?? "") ||
    primaryColor !== chatbot.primaryColor ||
    status !== chatbot.status;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          welcomeMessage,
          persona,
          systemPrompt,
          primaryColor,
          status,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Save failed");
      }
      const data = await res.json();
      onUpdate(data.chatbot as Chatbot);
      toast.success("Chatbot updated", {
        description: "Your changes are live.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error("Failed to save", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      {/* Form */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-primary" />
            Bot Configuration
          </CardTitle>
          <CardDescription>
            Tune your assistant&apos;s identity, personality, and behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Bot name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Support Bot"
              maxLength={80}
            />
          </div>

          {/* Welcome message */}
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome message</Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi! How can I help you today?"
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Shown when a visitor opens the chat widget.
            </p>
          </div>

          {/* Persona */}
          <div className="space-y-2">
            <Label htmlFor="persona">Persona</Label>
            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger id="persona" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERSONAS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PERSONAS[persona]?.description}
            </p>
          </div>

          {/* System prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System prompt</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful customer support assistant..."
              rows={6}
              maxLength={4000}
              className="resize-y font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              The base instructions your bot follows. Knowledge base &amp;
              FAQs are appended automatically.
            </p>
          </div>

          {/* Primary color */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="size-4" />
              Primary color
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
                aria-label="Pick primary color"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32 font-mono text-sm"
                maxLength={7}
                aria-label="Primary color hex"
              />
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setPrimaryColor(c.hex)}
                    className={cn(
                      "size-7 rounded-full border-2 transition-all hover:scale-110",
                      primaryColor.toLowerCase() === c.hex.toLowerCase()
                        ? "border-foreground"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c.hex }}
                  >
                    <span className="sr-only">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="status">Status</Label>
              <p className="text-xs text-muted-foreground">
                Paused bots won&apos;t reply to new visitor messages.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xs font-medium",
                  status === "ACTIVE"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                )}
              >
                {status === "ACTIVE" ? "Active" : "Paused"}
              </span>
              <Switch
                id="status"
                checked={status === "ACTIVE"}
                onCheckedChange={(checked) =>
                  setStatus(checked ? "ACTIVE" : "PAUSED")
                }
                aria-label="Toggle bot status"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="min-w-32"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <PreviewWidget
          botName={name || "Support Bot"}
          welcomeMessage={welcomeMessage}
          primaryColor={primaryColor}
          persona={persona}
        />
      </div>
    </div>
  );
}

function PreviewWidget({
  botName,
  welcomeMessage,
  primaryColor,
  persona,
}: {
  botName: string;
  welcomeMessage: string;
  primaryColor: string;
  persona: string;
}) {
  const [messages, setMessages] = React.useState<
    { role: "bot" | "user"; text: string }[]
  >([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setSending(true);
    try {
      const res = await fetch("/api/chatbot/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "bot", text: data.reply as string },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "I'm having trouble responding right now. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader
        className="pb-3"
        style={{
          backgroundColor: primaryColor,
          color: "#fff",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-full bg-white/20 backdrop-blur"
            aria-hidden
          >
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-semibold">
              {botName}
            </CardTitle>
            <p className="text-xs text-white/80">
              {persona} ·{" "}
              <span className="inline-flex items-center gap-1">
                <span className="inline-block size-1.5 rounded-full bg-emerald-300" />
                Online
              </span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="max-h-80 min-h-[220px] space-y-3 overflow-y-auto bg-muted/40 p-4 scroll-thin"
        >
          {/* Welcome bubble */}
          <ChatBubble
            role="bot"
            text={welcomeMessage || "Hi! How can I help you today?"}
            primaryColor={primaryColor}
          />

          {/* Conversation */}
          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              role={m.role}
              text={m.text}
              primaryColor={primaryColor}
            />
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex items-start gap-2">
              <div
                className="flex size-7 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
                aria-hidden
              >
                <Bot className="size-4" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-background px-3 py-2 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
                  <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
                  <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test input */}
        <div className="border-t bg-background p-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Test your bot…"
              disabled={sending}
              className="h-9"
              aria-label="Test message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              style={{ backgroundColor: primaryColor, color: "#fff" }}
              aria-label="Send test message"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChatBubble({
  role,
  text,
  primaryColor,
}: {
  role: "bot" | "user";
  text: string;
  primaryColor: string;
}) {
  const isBot = role === "bot";
  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      {isBot && (
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: primaryColor }}
          aria-hidden
        >
          <Bot className="size-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isBot
            ? "rounded-bl-sm bg-background text-foreground"
            : "rounded-br-sm text-white"
        )}
        style={isBot ? undefined : { backgroundColor: primaryColor }}
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
    </div>
  );
}

// ─── Tab 2: Knowledge Base ───────────────────────────────────────
function KnowledgeTab({
  chatbot,
  onChange,
}: {
  chatbot: Chatbot;
  onChange: () => void;
}) {
  const docs = chatbot.knowledge;
  const totalWords = React.useMemo(
    () =>
      docs.reduce(
        (sum, d) => sum + d.content.trim().split(/\s+/).filter(Boolean).length,
        0
      ),
    [docs]
  );

  return (
    <div className="space-y-4">
      {/* Stats + add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="gap-1">
            <FileText className="size-3" />
            {docs.length} document{docs.length === 1 ? "" : "s"}
          </Badge>
          <span>·</span>
          <span>{totalWords.toLocaleString()} total words</span>
        </div>
        <AddKnowledgeDialog chatbotId={chatbot.id} onCreated={onChange} />
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-8 text-primary" />}
          title="No documents yet"
          description="Add your first knowledge document so your bot can answer questions about your business."
          action={<AddKnowledgeDialog chatbotId={chatbot.id} onCreated={onChange} triggerLabel="Add your first document" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {docs
            .slice()
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((doc) => (
              <KnowledgeCard
                key={doc.id}
                doc={doc}
                onDeleted={onChange}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeCard({
  doc,
  onDeleted,
}: {
  doc: KnowledgeDoc;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/chatbot/knowledge/${doc.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Document deleted");
      onDeleted();
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="group rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <FileText className="size-4 shrink-0 text-primary" />
              <h3 className="truncate font-medium" title={doc.title}>
                {doc.title}
              </h3>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {doc.content}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deleting}
                aria-label="Delete document"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete document?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove &ldquo;{doc.title}&rdquo; from
                  your knowledge base. Your bot will no longer use it when
                  answering questions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Separator className="my-3" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="font-mono text-[10px]">
            {doc.sourceType}
          </Badge>
          <time dateTime={doc.createdAt}>
            {format(new Date(doc.createdAt), "MMM d, yyyy")}
          </time>
        </div>
      </CardContent>
    </Card>
  );
}

function AddKnowledgeDialog({
  chatbotId: _chatbotId,
  onCreated,
  triggerLabel = "Add document",
}: {
  chatbotId: string;
  onCreated: () => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/chatbot/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Create failed");
      }
      toast.success("Document added", {
        description: "Your bot can now use this knowledge.",
      });
      setTitle("");
      setContent("");
      setOpen(false);
      onCreated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error("Failed to add document", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add knowledge document</DialogTitle>
            <DialogDescription>
              Paste any text your bot should learn from — policies, FAQs,
              product docs, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="kb-title">Title</Label>
            <Input
              id="kb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Refund Policy"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kb-content">Content</Label>
            <Textarea
              id="kb-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="We offer a 30-day money-back guarantee on all plans…"
              rows={8}
              required
              className="resize-y"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add document"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 3: FAQs ─────────────────────────────────────────────────
function FaqsTab({
  chatbot,
  onChange,
}: {
  chatbot: Chatbot;
  onChange: () => void;
}) {
  const faqs = chatbot.faqs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="gap-1">
            <HelpCircle className="size-3" />
            {faqs.length} FAQ{faqs.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <AddFaqDialog onCreated={onChange} />
      </div>

      {faqs.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="size-8 text-primary" />}
          title="No FAQs yet"
          description="Add common questions and answers to give your bot instant coverage for repetitive queries."
          action={<AddFaqDialog onCreated={onChange} triggerLabel="Add your first FAQ" />}
        />
      ) : (
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-2">
            <Accordion type="single" collapsible className="w-full">
              {faqs
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((faq) => (
                  <FaqItem key={faq.id} faq={faq} onDeleted={onChange} />
                ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FaqItem({ faq, onDeleted }: { faq: FAQ; onDeleted: () => void }) {
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/chatbot/faqs/${faq.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("FAQ deleted");
      onDeleted();
    } catch {
      toast.error("Failed to delete FAQ");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AccordionItem
      value={faq.id}
      className="rounded-lg px-3 transition-colors hover:bg-accent/50"
    >
      <AccordionTrigger className="items-center">
        <span className="pr-2 text-left font-medium">{faq.question}</span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex items-start justify-between gap-3">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {faq.answer}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deleting}
                aria-label="Delete FAQ"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this FAQ from your bot&apos;s
                  knowledge.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function AddFaqDialog({
  onCreated,
  triggerLabel = "Add FAQ",
}: {
  onCreated: () => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/chatbot/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Create failed");
      }
      toast.success("FAQ added");
      setQuestion("");
      setAnswer("");
      setOpen(false);
      onCreated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error("Failed to add FAQ", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add FAQ</DialogTitle>
            <DialogDescription>
              A question and answer your bot will learn to recognize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="faq-question">Question</Label>
            <Input
              id="faq-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are your business hours?"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-answer">Answer</Label>
            <Textarea
              id="faq-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="We're open Monday to Friday, 9 AM to 6 PM…"
              rows={5}
              required
              className="resize-y"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !question.trim() || !answer.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add FAQ"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 4: Embed ────────────────────────────────────────────────
function EmbedTab({ chatbot }: { chatbot: Chatbot }) {
  const [copied, setCopied] = React.useState(false);
  const snippet = `<script src="https://cdn.replyai.app/widget.js" data-bot-id="${chatbot.id}" defer></script>`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code2 className="size-5 text-primary" />
            Embed snippet
          </CardTitle>
          <CardDescription>
            Drop this single line of code on your website to launch the chat
            widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 pr-12 text-xs leading-relaxed scroll-thin">
              <code className="font-mono">{snippet}</code>
            </pre>
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="absolute right-2 top-2 size-8"
              aria-label="Copy snippet"
            >
              {copied ? (
                <Check className="size-4 text-emerald-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Quick start</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </span>
                <span>Copy the snippet above.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  2
                </span>
                <span>
                  Paste it right before{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    &lt;/body&gt;
                  </code>{" "}
                  on your website.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  3
                </span>
                <span>Done! Your bot is live.</span>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="size-5 text-primary" />
            Try it live
          </CardTitle>
          <CardDescription>
            Preview the widget exactly as your visitors will see it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: chatbot.primaryColor }}
                aria-hidden
              />
              <span className="font-medium">{chatbot.name}</span>
              <Badge
                variant={chatbot.status === "ACTIVE" ? "default" : "secondary"}
                className="ml-auto"
              >
                {chatbot.status === "ACTIVE" ? "Active" : "Paused"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Bot ID:{" "}
              <code className="font-mono text-[11px]">{chatbot.id}</code>
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/widget-demo">
              <ExternalLink className="size-4" />
              Open live demo
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared: Empty State ─────────────────────────────────────────
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl border border-dashed shadow-sm">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="font-medium">{title}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
