"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Connection = {
  id: string;
  platform: string;
  accountName: string;
  accountHandle: string | null;
  status: "ACTIVE";
};

type ScheduledMessage = {
  id: string;
  connectionId: string;
  platform: string;
  recipientId: string | null;
  recipientHandle: string | null;
  content: string;
  scheduledFor: string;
  status: "PENDING" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  connection: { accountName: string; accountHandle: string | null };
};

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const statusBadge: Record<string, string> = {
  PENDING: "bg-foreground/5 text-foreground",
  QUEUED: "bg-foreground/5 text-foreground",
  SENT: "bg-emerald-500/10 text-emerald-700",
  FAILED: "bg-rose-500/10 text-rose-700",
  CANCELLED: "bg-foreground/5 text-muted-foreground line-through",
};

export function SchedulerView({
  connections,
  messages: initialMessages,
}: {
  connections: Connection[];
  messages: ScheduledMessage[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<ScheduledMessage[]>(initialMessages);

  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [recipientId, setRecipientId] = useState("");
  const [recipientHandle, setRecipientHandle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledFor, setScheduledFor] = useState(
    formatDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000))
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!connectionId) {
      toast.error("Connect a platform first.");
      return;
    }
    if (!content.trim()) {
      toast.error("Message content is required.");
      return;
    }
    setSubmitting(true);
    try {
      const iso = new Date(scheduledFor).toISOString();
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          recipientId: recipientId || null,
          recipientHandle: recipientHandle || null,
          content,
          scheduledFor: iso,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to schedule.");
        setSubmitting(false);
        return;
      }
      toast.success("Message scheduled.");
      setContent("");
      setRecipientId("");
      setRecipientHandle("");
      const listRes = await fetch("/api/scheduler");
      const listData = await listRes.json();
      if (listData.messages) setMessages(listData.messages);
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCancel(id: string) {
    const res = await fetch(`/api/scheduler?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Cancelled.");
      setMessages((m) => m.map((x) => x.id === id ? { ...x, status: "CANCELLED" } : x));
    } else {
      toast.error("Failed to cancel.");
    }
  }

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <Calendar className="h-6 w-6 mx-auto text-muted-foreground" />
        <h2 className="mt-4 text-base font-medium">No connected platforms yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect Facebook, Instagram, WhatsApp, or LinkedIn on the{" "}
          <a href="/connections" className="text-foreground underline hover:no-underline">Connections page</a>{" "}
          before scheduling messages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          <h2 className="text-sm font-medium">Schedule a new message</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="connection" className="text-xs">Platform</Label>
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger id="connection"><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.accountName} ({c.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scheduledFor" className="text-xs">Send at</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              required
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipientId" className="text-xs">
              Recipient ID <span className="text-muted-foreground">(platform-specific)</span>
            </Label>
            <Input
              id="recipientId"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="e.g. PSID for FB, phone for WhatsApp, urn:li:person:123 for LinkedIn"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipientHandle" className="text-xs">
              Recipient handle <span className="text-muted-foreground">(optional, for display)</span>
            </Label>
            <Input
              id="recipientHandle"
              value={recipientHandle}
              onChange={(e) => setRecipientHandle(e.target.value)}
              placeholder="e.g. @jane, +1 555 0100, jane@acme.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content" className="text-xs">Message</Label>
          <Textarea
            id="content"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message here. Plain text — each platform formats it on send."
            rows={5}
          />
          <p className="text-[11px] text-muted-foreground">
            {content.length} characters. Some platforms have strict length limits
            (e.g. WhatsApp text messages ≤ 4096 chars).
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Calendar className="h-4 w-4 mr-1.5" />}
            Schedule
          </Button>
        </div>
      </form>

      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-medium">Scheduled messages</h2>
          <span className="text-xs text-muted-foreground">{messages.length} total</span>
        </div>
        {messages.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No messages scheduled yet.
          </div>
        ) : (
          <div className="divide-y">
            {messages.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{m.platform}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground truncate">{m.connection.accountName}</span>
                    {m.recipientHandle && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">→ {m.recipientHandle}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-sm line-clamp-2">{m.content}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Scheduled for {new Date(m.scheduledFor).toLocaleString()}</span>
                    {m.sentAt && <span>· Sent {new Date(m.sentAt).toLocaleString()}</span>}
                    {m.attempts > 0 && <span>· Attempts: {m.attempts}</span>}
                    {m.lastError && <span className="text-rose-600">· {m.lastError}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${statusBadge[m.status] || ""}`}>
                    {m.status}
                  </span>
                  {(m.status === "PENDING" || m.status === "QUEUED" || m.status === "FAILED") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onCancel(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
