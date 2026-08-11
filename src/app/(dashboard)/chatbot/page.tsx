"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
  Search,
  Globe,
  Eye,
  Download,
  X,
  QrCode,
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
import { Checkbox } from "@/components/ui/checkbox";

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
              Knowledge
              {chatbot.knowledge.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                  {chatbot.knowledge.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-1.5">
              <HelpCircle className="size-4" />
              FAQs
              {chatbot.faqs.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                  {chatbot.faqs.length}
                </Badge>
              )}
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

      {/* Live preview - mini widget mockup */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <MiniWidgetPreview
          botName={name || "Support Bot"}
          welcomeMessage={welcomeMessage}
          primaryColor={primaryColor}
          persona={persona}
          status={status}
        />
      </div>
    </div>
  );
}

/** Mini widget preview showing header + welcome message */
function MiniWidgetPreview({
  botName,
  welcomeMessage,
  primaryColor,
  persona,
  status,
}: {
  botName: string;
  welcomeMessage: string;
  primaryColor: string;
  persona: string;
  status: string;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="size-4 text-muted-foreground" />
          Live Preview
        </CardTitle>
        <CardDescription className="text-xs">
          See how your widget will appear to visitors
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-xl overflow-hidden shadow-inner">
          {/* Mock widget header */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: primaryColor, color: "#fff" }}
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Bot className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{botName}</div>
              <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                <span className="capitalize">{persona}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <span className={cn(
                    "inline-block size-1.5 rounded-full",
                    status === "ACTIVE" ? "bg-emerald-300" : "bg-white/40"
                  )} />
                  {status === "ACTIVE" ? "Online" : "Offline"}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="size-2 rounded-full bg-white/40" />
              <div className="size-2 rounded-full bg-white/40" />
              <div className="size-2 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Mock chat body with welcome message */}
          <div className="bg-muted/30 p-4 space-y-3">
            {/* Bot welcome bubble */}
            <div className="flex items-start gap-2">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Bot className="size-3.5" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-background px-3 py-2 text-sm shadow-sm">
                <p className="whitespace-pre-wrap break-words text-foreground">
                  {welcomeMessage || "Hi! How can I help you today?"}
                </p>
              </div>
            </div>

            {/* Placeholder typing area */}
            <div className="flex items-center gap-2 px-1 pt-2">
              <div className="flex-1 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                Type a message…
              </div>
              <div
                className="flex size-7 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="size-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick info */}
        <div className="px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground border-t">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="truncate font-medium">{botName}</span>
          <span>·</span>
          <span className="capitalize">{persona}</span>
        </div>
      </CardContent>
    </Card>
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const totalWords = React.useMemo(
    () =>
      docs.reduce(
        (sum, d) => sum + d.content.trim().split(/\s+/).filter(Boolean).length,
        0
      ),
    [docs]
  );

  const filteredDocs = React.useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase();
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }, [docs, searchQuery]);

  const sortedDocs = React.useMemo(
    () =>
      filteredDocs
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [filteredDocs]
  );

  const allSelected = sortedDocs.length > 0 && sortedDocs.every((d) => selectedIds.has(d.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedDocs.map((d) => d.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/chatbot/knowledge/${id}`, { method: "DELETE" })
        )
      );
      toast.success(`${selectedIds.size} document(s) deleted`);
      setSelectedIds(new Set());
      onChange();
    } catch {
      toast.error("Failed to delete some documents");
    } finally {
      setBulkDeleting(false);
    }
  }

  function getDocIcon(sourceType: string) {
    switch (sourceType.toUpperCase()) {
      case "URL":
        return <Globe className="size-4 shrink-0 text-sky-500" />;
      case "FAQ":
        return <HelpCircle className="size-4 shrink-0 text-amber-500" />;
      default:
        return <FileText className="size-4 shrink-0 text-primary" />;
    }
  }

  function getContentSize(content: string): string {
    const chars = content.length;
    if (chars < 200) return "Short";
    if (chars < 1000) return "Medium";
    return "Long";
  }

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
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <Badge variant="destructive" className="gap-1">
                {selectedIds.size} selected
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="h-8 gap-1.5"
              >
                {bulkDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-8"
              >
                <X className="size-3.5" />
              </Button>
            </motion.div>
          )}
          <AddKnowledgeDialog chatbotId={chatbot.id} onCreated={onChange} />
        </div>
      </div>

      {/* Search bar */}
      {docs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or content…"
            className="pl-9"
          />
        </div>
      )}

      {docs.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-8 text-primary" />}
          title="No documents yet"
          description="Add your first knowledge document so your bot can answer questions about your business."
          action={<AddKnowledgeDialog chatbotId={chatbot.id} onCreated={onChange} triggerLabel="Add your first document" />}
        />
      ) : sortedDocs.length === 0 ? (
        <Card className="rounded-xl border border-dashed">
          <CardContent className="py-10 text-center">
            <Search className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No documents match &ldquo;{searchQuery}&rdquo;
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.length > 1 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all documents"
              />
              <span className="text-xs text-muted-foreground">
                {allSelected ? "Deselect all" : "Select all"}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sortedDocs.map((doc) => (
              <KnowledgeCard
                key={doc.id}
                doc={doc}
                onDeleted={onChange}
                selected={selectedIds.has(doc.id)}
                onToggleSelect={() => toggleSelect(doc.id)}
                icon={getDocIcon(doc.sourceType)}
                contentSize={getContentSize(doc.content)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KnowledgeCard({
  doc,
  onDeleted,
  selected,
  onToggleSelect,
  icon,
  contentSize,
}: {
  doc: KnowledgeDoc;
  onDeleted: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  icon: React.ReactNode;
  contentSize: string;
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
    <Card className={cn(
      "group rounded-xl border shadow-sm transition-all hover:shadow-md",
      selected && "ring-2 ring-primary/40 border-primary/40"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${doc.title}`}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              {icon}
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {doc.sourceType}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {contentSize}
            </Badge>
          </div>
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [importOpen, setImportOpen] = React.useState(false);

  const filteredFaqs = React.useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
    );
  }, [faqs, searchQuery]);

  const sortedFaqs = React.useMemo(
    () =>
      filteredFaqs
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [filteredFaqs]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="gap-1">
            <HelpCircle className="size-3" />
            {faqs.length} FAQ{faqs.length === 1 ? "" : "s"}
          </Badge>
          {searchQuery && filteredFaqs.length !== faqs.length && (
            <span className="text-xs">
              ({filteredFaqs.length} matching)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Import
          </Button>
          <AddFaqDialog onCreated={onChange} />
        </div>
      </div>

      {/* Search bar */}
      {faqs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs…"
            className="pl-9"
          />
        </div>
      )}

      {faqs.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="size-8 text-primary" />}
          title="No FAQs yet"
          description="Add common questions and answers to give your bot instant coverage for repetitive queries."
          action={<AddFaqDialog onCreated={onChange} triggerLabel="Add your first FAQ" />}
        />
      ) : sortedFaqs.length === 0 ? (
        <Card className="rounded-xl border border-dashed">
          <CardContent className="py-10 text-center">
            <Search className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No FAQs match &ldquo;{searchQuery}&rdquo;
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-2">
            <Accordion type="single" collapsible className="w-full">
              {sortedFaqs.map((faq, idx) => (
                <FaqItem key={faq.id} faq={faq} onDeleted={onChange} index={idx} />
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Bulk Import Dialog */}
      <BulkImportFaqDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onCreated={onChange}
      />
    </div>
  );
}

function FaqItem({ faq, onDeleted, index }: { faq: FAQ; onDeleted: () => void; index: number }) {
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
      className={cn(
        "rounded-lg px-3 transition-colors hover:bg-accent/50",
        index % 2 === 1 && "bg-muted/30"
      )}
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

/** Bulk import dialog for pasting multiple Q&A pairs */
function BulkImportFaqDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [rawText, setRawText] = React.useState("");
  const [importing, setImporting] = React.useState(false);

  async function handleImport() {
    if (!rawText.trim()) return;
    setImporting(true);
    try {
      // Parse Q&A pairs: each pair separated by blank line,
      // Q: prefix for question, A: prefix for answer
      const pairs: { question: string; answer: string }[] = [];
      const blocks = rawText.trim().split(/\n\s*\n/);

      for (const block of blocks) {
        const lines = block.trim().split("\n");
        let question = "";
        let answer = "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (/^Q:\s*/i.test(trimmed)) {
            question = trimmed.replace(/^Q:\s*/i, "");
          } else if (/^A:\s*/i.test(trimmed)) {
            answer = trimmed.replace(/^A:\s*/i, "");
          } else if (!question) {
            question = trimmed;
          } else {
            answer += (answer ? "\n" : "") + trimmed;
          }
        }

        if (question.trim() && answer.trim()) {
          pairs.push({ question: question.trim(), answer: answer.trim() });
        }
      }

      if (pairs.length === 0) {
        toast.error("No valid Q&A pairs found. Use Q: and A: prefixes.");
        return;
      }

      const results = await Promise.allSettled(
        pairs.map((pair) =>
          fetch("/api/chatbot/faqs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pair),
          })
        )
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed === 0) {
        toast.success(`Imported ${succeeded} FAQ(s)`);
      } else {
        toast.warning(`Imported ${succeeded} FAQ(s), ${failed} failed`);
      }

      setRawText("");
      onOpenChange(false);
      onCreated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error("Import failed", { description: msg });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import FAQs</DialogTitle>
          <DialogDescription>
            Paste multiple Q&amp;A pairs. Separate each pair with a blank line.
            Use <code className="rounded bg-muted px-1 font-mono text-xs">Q:</code> for questions
            and <code className="rounded bg-muted px-1 font-mono text-xs">A:</code> for answers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Q: What are your hours?\nA: We're open Mon-Fri 9-6.\n\nQ: Do you offer refunds?\nA: Yes, within 30 days of purchase.`}
            rows={10}
            className="resize-y font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            {rawText.trim().split(/\n\s*\n/).filter(Boolean).length} pair(s) detected
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || !rawText.trim()}
          >
            {importing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Download className="size-4" />
                Import FAQs
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 4: Embed ────────────────────────────────────────────────
function EmbedTab({ chatbot }: { chatbot: Chatbot }) {
  const [copied, setCopied] = React.useState(false);
  const [copySuccess, setCopySuccess] = React.useState(false);
  const snippet = `<script src="https://cdn.replyai.app/widget.js" data-bot-id="${chatbot.id}" defer></script>`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setCopySuccess(true);
      toast.success("Copied to clipboard");
      setTimeout(() => {
        setCopied(false);
      }, 2000);
      setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  }

  const widgetUrl = typeof window !== "undefined"
    ? `${window.location.origin}/widget/${chatbot.id}`
    : `/widget/${chatbot.id}`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        {/* Embed snippet card */}
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
              <motion.button
                onClick={handleCopy}
                className={cn(
                  "absolute right-2 top-2 size-8 rounded-md flex items-center justify-center transition-colors border",
                  copySuccess
                    ? "bg-emerald-100 border-emerald-300 text-emerald-600 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400"
                    : "bg-background border-border hover:bg-accent text-muted-foreground"
                )}
                whileTap={{ scale: 0.9 }}
                aria-label="Copy snippet"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <Check className="size-4" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Copy className="size-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
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

        {/* QR Code / Widget URL Card */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="size-5 text-primary" />
              Widget URL
            </CardTitle>
            <CardDescription>
              Share this direct link or scan the QR code to test the widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs truncate">
                {widgetUrl}
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
                <Link href={`/widget/${chatbot.id}`} target="_blank">
                  <ExternalLink className="size-3.5" />
                  Test
                </Link>
              </Button>
            </div>
            {/* Simple QR code placeholder */}
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
              <svg
                viewBox="0 0 100 100"
                className="size-32"
                aria-label="QR code placeholder"
              >
                {/* QR-like pattern */}
                <rect x="0" y="0" width="100" height="100" fill="white" />
                {/* Top-left finder */}
                <rect x="2" y="2" width="26" height="26" fill="black" rx="2" />
                <rect x="5" y="5" width="20" height="20" fill="white" rx="1" />
                <rect x="8" y="8" width="14" height="14" fill="black" rx="1" />
                {/* Top-right finder */}
                <rect x="72" y="2" width="26" height="26" fill="black" rx="2" />
                <rect x="75" y="5" width="20" height="20" fill="white" rx="1" />
                <rect x="78" y="8" width="14" height="14" fill="black" rx="1" />
                {/* Bottom-left finder */}
                <rect x="2" y="72" width="26" height="26" fill="black" rx="2" />
                <rect x="5" y="75" width="20" height="20" fill="white" rx="1" />
                <rect x="8" y="78" width="14" height="14" fill="black" rx="1" />
                {/* Data pattern (decorative) */}
                <rect x="32" y="32" width="6" height="6" fill="black" />
                <rect x="44" y="32" width="6" height="6" fill="black" />
                <rect x="56" y="32" width="6" height="6" fill="black" />
                <rect x="32" y="44" width="6" height="6" fill="black" />
                <rect x="44" y="44" width="6" height="6" fill="black" />
                <rect x="62" y="44" width="6" height="6" fill="black" />
                <rect x="38" y="56" width="6" height="6" fill="black" />
                <rect x="50" y="56" width="6" height="6" fill="black" />
                <rect x="62" y="56" width="6" height="6" fill="black" />
                <rect x="32" y="62" width="6" height="6" fill="black" />
                <rect x="50" y="62" width="6" height="6" fill="black" />
                <rect x="72" y="32" width="6" height="6" fill="black" />
                <rect x="80" y="44" width="6" height="6" fill="black" />
                <rect x="72" y="56" width="6" height="6" fill="black" />
                <rect x="32" y="72" width="6" height="6" fill="black" />
                <rect x="44" y="72" width="6" height="6" fill="black" />
                <rect x="56" y="80" width="6" height="6" fill="black" />
                <rect x="44" y="88" width="6" height="6" fill="black" />
                <rect x="72" y="72" width="6" height="6" fill="black" />
                <rect x="84" y="72" width="6" height="6" fill="black" />
                <rect x="72" y="84" width="6" height="6" fill="black" />
                <rect x="88" y="88" width="6" height="6" fill="black" />
              </svg>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Scan with your phone to preview the widget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Try it live card + widget preview */}
      <div className="space-y-4 lg:sticky lg:top-6">
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

            {/* Mini widget preview */}
            <div className="overflow-hidden rounded-lg border shadow-inner">
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{ backgroundColor: chatbot.primaryColor, color: "#fff" }}
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-white/20">
                  <Bot className="size-3" />
                </div>
                <span className="text-xs font-semibold truncate">{chatbot.name}</span>
              </div>
              <div className="bg-muted/30 p-3">
                <div className="flex items-start gap-2">
                  <div
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: chatbot.primaryColor }}
                  >
                    <Bot className="size-2.5" />
                  </div>
                  <div className="rounded-xl rounded-bl-sm bg-background px-2.5 py-1.5 text-xs shadow-sm max-w-[85%]">
                    {chatbot.welcomeMessage || "Hi! How can I help you today?"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <Link href="/widget-demo">
                  <ExternalLink className="size-4" />
                  Live demo
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/widget/${chatbot.id}`} target="_blank">
                  <Eye className="size-4" />
                  Test in new tab
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
