"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2, Bot, Zap, Bell, Clock, AlertCircle, Check, X } from "lucide-react";
import { toast } from "sonner";

type Rule = {
  id: string;
  name: string;
  status: string;
  triggerPlatform: string;
  triggerEvent: string;
  conditions: string;
  actionType: string;
  actionConfig: string;
  priority: number;
  matchedCount: number;
  lastMatchedAt: string | null;
  createdAt: string;
};

type Log = {
  id: string;
  triggerPlatform: string;
  triggerEvent: string;
  inboundSummary: string;
  actionType: string;
  outcome: string;
  outboundPreview: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  createdAt: string;
  rule: { name: string } | null;
};

const PLATFORMS = [
  { id: "FACEBOOK", label: "Facebook Messenger" },
  { id: "INSTAGRAM", label: "Instagram DMs" },
  { id: "WHATSAPP", label: "WhatsApp Business" },
  { id: "LINKEDIN", label: "LinkedIn" },
  { id: "GOOGLE", label: "Gmail + Calendar" },
  { id: "WEB", label: "ReplyAI Widget" },
];

const EVENTS_BY_PLATFORM: Record<string, { id: string; label: string }[]> = {
  FACEBOOK: [
    { id: "MESSAGE_RECEIVED", label: "When a customer sends a message" },
    { id: "COMMENT_RECEIVED", label: "When a customer comments on a post" },
    { id: "MENTION", label: "When the page is mentioned" },
  ],
  INSTAGRAM: [
    { id: "MESSAGE_RECEIVED", label: "When a customer sends a DM" },
    { id: "COMMENT_RECEIVED", label: "When a customer comments" },
    { id: "MENTION", label: "When the account is @-mentioned" },
  ],
  WHATSAPP: [
    { id: "MESSAGE_RECEIVED", label: "When a customer sends a WhatsApp message" },
  ],
  LINKEDIN: [
    { id: "MESSAGE_RECEIVED", label: "When a connection sends a message" },
  ],
  GOOGLE: [
    { id: "EMAIL_RECEIVED", label: "When a new email arrives in Gmail" },
    { id: "CALENDAR_STARTING", label: "When a calendar event is about to start" },
  ],
  WEB: [
    { id: "MESSAGE_RECEIVED", label: "When a website visitor opens a chat" },
  ],
};

const ACTIONS = [
  { id: "AI_REPLY", label: "Generate AI reply", icon: Bot },
  { id: "CANNED_REPLY", label: "Send canned response", icon: Zap },
  { id: "ESCALATE", label: "Escalate to human agent", icon: AlertCircle },
  { id: "NOTIFY", label: "Notify team only", icon: Bell },
  { id: "SCHEDULE_FOLLOWUP", label: "Schedule a follow-up later", icon: Clock },
];

export function AutomationView({ dbDown }: { dbDown: boolean }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/automation?logs=1", { cache: "no-store" });
      const data = await res.json();
      setRules(data.rules ?? []);
      setLogs(data.logs ?? []);
    } catch (err) {
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggleStatus(rule: Rule, next: boolean) {
    const newStatus = next ? "ACTIVE" : "PAUSED";
    // Optimistic update
    setRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, status: newStatus } : r));
    try {
      const res = await fetch("/api/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Failed to update rule");
        setRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, status: rule.status } : r));
      }
    } catch {
      toast.error("Network error");
      setRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, status: rule.status } : r));
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this automation rule?")) return;
    try {
      const res = await fetch(`/api/automation?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules((rs) => rs.filter((r) => r.id !== id));
        toast.success("Rule deleted");
      } else {
        toast.error("Failed to delete rule");
      }
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div className="space-y-8">
      {dbDown && (
        <div className="rounded-md border border-amber-200/60 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Database is unreachable. You can still browse existing rules but
            cannot create or edit them until the DB connection is restored.
          </div>
        </div>
      )}

      {/* Rules section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-medium">Automation rules</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rules fire when inbound events match. Higher priority = evaluated first.
            </p>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New rule
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          {loading ? (
            <div className="px-5 py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : rules.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No rules yet. Click <span className="font-medium text-foreground">New rule</span> to define your first automation.
            </div>
          ) : (
            <div className="divide-y">
              {rules.map((r) => {
                const platform = PLATFORMS.find((p) => p.id === r.triggerPlatform);
                const action = ACTIONS.find((a) => a.id === r.actionType);
                const ActionIcon = action?.icon ?? Zap;
                const lastMatched = r.lastMatchedAt ? new Date(r.lastMatchedAt).toLocaleString() : null;
                const active = r.status === "ACTIVE";
                return (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="h-9 w-9 rounded-md border bg-muted/40 flex items-center justify-center shrink-0">
                        <ActionIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium">{r.name}</h3>
                          <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border-transparent">
                            {platform?.label ?? r.triggerPlatform}
                          </span>
                          <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border-transparent ${
                            active ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
                            r.status === "PAUSED" ? "bg-muted text-muted-foreground" :
                            "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            matched {r.matchedCount}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {action?.label} · priority {r.priority}
                        </p>
                        {lastMatched && (
                          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                            Last fired {lastMatched}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Switch
                          checked={active}
                          onCheckedChange={(v) => toggleStatus(r, v)}
                          aria-label="Toggle rule"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditing(r); setDialogOpen(true); }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => deleteRule(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Logs section */}
      <section>
        <h2 className="text-sm font-medium mb-3">Recent activity</h2>
        <div className="rounded-lg border bg-card">
          {logs.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No automation runs yet. When a customer triggers a rule, it will appear here.
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const isSent = log.outcome === "SENT";
                const isFailed = log.outcome === "FAILED";
                return (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                      isSent ? "bg-emerald-100 dark:bg-emerald-500/15" :
                      isFailed ? "bg-rose-100 dark:bg-rose-500/15" :
                      "bg-muted"
                    }`}>
                      {isSent ? <Check className="h-3 w-3 text-emerald-700 dark:text-emerald-300" /> :
                       isFailed ? <X className="h-3 w-3 text-rose-700 dark:text-rose-300" /> :
                       <Clock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.rule?.name ?? "Deleted rule"}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border-transparent">
                          {log.triggerPlatform}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {log.outboundPreview && (
                        <p className="mt-1 text-xs text-foreground truncate">
                          → {log.outboundPreview}
                        </p>
                      )}
                      {log.errorMessage && (
                        <p className="mt-1 text-xs text-destructive truncate">
                          {log.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => { setDialogOpen(false); refresh(); }}
      />
    </div>
  );
}

function RuleDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Rule | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [triggerPlatform, setTriggerPlatform] = useState("FACEBOOK");
  const [triggerEvent, setTriggerEvent] = useState("MESSAGE_RECEIVED");
  const [actionType, setActionType] = useState("AI_REPLY");
  const [conditionField, setConditionField] = useState("text");
  const [conditionOp, setConditionOp] = useState("contains");
  const [conditionValue, setConditionValue] = useState("");
  const [persona, setPersona] = useState("professional");
  const [cannedId, setCannedId] = useState("");
  const [delayMin, setDelayMin] = useState(30);
  const [followupContent, setFollowupContent] = useState("");
  const [priority, setPriority] = useState(100);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setTriggerPlatform(editing.triggerPlatform);
      setTriggerEvent(editing.triggerEvent);
      setActionType(editing.actionType);
      setPriority(editing.priority);
      try {
        const cs = JSON.parse(editing.conditions || "[]");
        if (Array.isArray(cs) && cs.length > 0) {
          setConditionField(cs[0].field ?? "text");
          setConditionOp(cs[0].op ?? "contains");
          setConditionValue(cs[0].value ?? "");
        } else {
          setConditionValue("");
        }
      } catch {}
      try {
        const cfg = JSON.parse(editing.actionConfig || "{}");
        setPersona(cfg.persona ?? "professional");
        setCannedId(cfg.cannedId ?? "");
        setDelayMin(cfg.delayMin ?? 30);
        setFollowupContent(cfg.content ?? "");
      } catch {}
    } else {
      setName("");
      setTriggerPlatform("FACEBOOK");
      setTriggerEvent("MESSAGE_RECEIVED");
      setActionType("AI_REPLY");
      setConditionField("text");
      setConditionOp("contains");
      setConditionValue("");
      setPersona("professional");
      setCannedId("");
      setDelayMin(30);
      setFollowupContent("");
      setPriority(100);
    }
  }, [open, editing]);

  async function save() {
    if (!name.trim()) { toast.error("Rule name is required"); return; }
    setSaving(true);
    const conditions = conditionValue.trim()
      ? [{ field: conditionField, op: conditionOp, value: conditionValue }]
      : [];
    let actionConfig: any = {};
    switch (actionType) {
      case "AI_REPLY": actionConfig = { persona }; break;
      case "CANNED_REPLY": actionConfig = { cannedId }; break;
      case "SCHEDULE_FOLLOWUP": actionConfig = { delayMin, content: followupContent }; break;
    }
    try {
      const method = editing ? "PATCH" : "POST";
      const body: any = {
        name, triggerPlatform, triggerEvent, actionType, actionConfig, conditions, priority,
      };
      if (editing) body.id = editing.id;
      const res = await fetch("/api/automation", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save rule");
      } else {
        toast.success(editing ? "Rule updated" : "Rule created");
        onSaved();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  const events = EVENTS_BY_PLATFORM[triggerPlatform] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit rule" : "New automation rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Rule name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Auto-reply to pricing questions" />
          </div>

          {/* Trigger */}
          <div className="space-y-2">
            <Label className="text-xs">Trigger</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Select value={triggerPlatform} onValueChange={(v) => {
                  setTriggerPlatform(v);
                  const evs = EVENTS_BY_PLATFORM[v] ?? [];
                  if (evs.length > 0 && !evs.some((e) => e.id === triggerEvent)) {
                    setTriggerEvent(evs[0].id);
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label className="text-xs">Condition (optional — empty matches all)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={conditionField} onValueChange={setConditionField}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Message text</SelectItem>
                  <SelectItem value="senderId">Sender ID</SelectItem>
                  <SelectItem value="senderName">Sender name</SelectItem>
                </SelectContent>
              </Select>
              <Select value={conditionOp} onValueChange={setConditionOp}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">contains</SelectItem>
                  <SelectItem value="equals">equals</SelectItem>
                  <SelectItem value="startsWith">starts with</SelectItem>
                  <SelectItem value="endsWith">ends with</SelectItem>
                  <SelectItem value="regex">matches regex</SelectItem>
                </SelectContent>
              </Select>
              <Input value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} placeholder="e.g. pricing" />
            </div>
          </div>

          {/* Action */}
          <div className="space-y-2">
            <Label className="text-xs">Action</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {actionType === "AI_REPLY" && (
              <div className="space-y-1.5">
                <Label className="text-xs">AI persona</Label>
                <Select value={persona} onValueChange={setPersona}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionType === "CANNED_REPLY" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Canned response ID</Label>
                <Input value={cannedId} onChange={(e) => setCannedId(e.target.value)} placeholder="Paste the canned response ID from Saved Replies" />
                <p className="text-[11px] text-muted-foreground">Find the ID in the URL of a saved reply in the chatbot tab.</p>
              </div>
            )}
            {actionType === "SCHEDULE_FOLLOWUP" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Delay (minutes)</Label>
                  <Input type="number" value={delayMin} onChange={(e) => setDelayMin(Number(e.target.value))} min={1} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Follow-up message</Label>
                  <Textarea value={followupContent} onChange={(e) => setFollowupContent(e.target.value)} placeholder="Hi! Just following up — any other questions I can help with?" rows={3} />
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label className="text-xs">Priority (higher = evaluated first)</Label>
            <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={1} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            {editing ? "Save changes" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
