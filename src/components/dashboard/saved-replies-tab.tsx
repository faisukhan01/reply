"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Zap,
  Plus,
  Trash2,
  Loader2,
  MessageSquareText,
  Keyboard,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";

type CannedResponse = {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  createdAt: string;
};

export function SavedRepliesTab() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [form, setForm] = useState({ title: "", content: "", shortcut: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/canned-responses");
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", content: "", shortcut: "" });
    setDialogOpen(true);
  }

  function openEdit(r: CannedResponse) {
    setEditing(r);
    setForm({
      title: r.title,
      content: r.content,
      shortcut: r.shortcut ?? "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        // Update via PUT (need to add this endpoint) — for now delete + recreate
        await fetch(`/api/canned-responses/${editing.id}`, { method: "DELETE" });
        const res = await fetch("/api/canned-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            content: form.content.trim(),
            shortcut: form.shortcut.trim() || null,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResponses((prev) => {
          const without = prev.filter((r) => r.id !== editing.id);
          return [data.response, ...without];
        });
        toast.success("Saved reply updated");
      } else {
        const res = await fetch("/api/canned-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            content: form.content.trim(),
            shortcut: form.shortcut.trim() || null,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResponses((prev) => [data.response, ...prev]);
        toast.success("Saved reply created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save reply");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/canned-responses/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setResponses((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success("Saved reply deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete reply");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border shadow-sm lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-500" />
                Saved Replies
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pre-written responses your team can insert with one click in the inbox.
              </p>
            </div>
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New reply
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : responses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 mb-3">
                  <MessageSquareText className="h-6 w-6 text-violet-500" />
                </div>
                <p className="text-sm font-medium">No saved replies yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Create your first saved reply to help your team respond faster to common questions.
                </p>
                <Button onClick={openCreate} size="sm" variant="outline" className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create reply
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {responses.map((r) => (
                  <div
                    key={r.id}
                    className="group flex items-start gap-3 rounded-lg border p-3 hover:border-violet-300 dark:hover:border-violet-700 transition-colors hover-lift"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <MessageSquareText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{r.title}</span>
                        {r.shortcut && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 font-mono gap-1"
                          >
                            <Keyboard className="h-2.5 w-2.5" />
                            {r.shortcut}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {r.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips card */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-fuchsia-500" />
              Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 text-xs font-semibold">
                1
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Use shortcuts like <code className="text-xs bg-muted px-1 py-0.5 rounded">/hi</code> to quickly find replies in the inbox.
              </p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 text-xs font-semibold">
                2
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Keep replies short (1-3 sentences). They are starting points, not final answers.
              </p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 text-xs font-semibold">
                3
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Click the <Zap className="inline h-3 w-3" /> icon in the inbox composer to access saved replies.
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 p-3 mt-2">
              <p className="text-xs text-violet-900 dark:text-violet-100 leading-relaxed">
                <strong>Pro tip:</strong> Pair saved replies with AI suggestions for maximum speed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit saved reply" : "New saved reply"}</DialogTitle>
            <DialogDescription>
              Create a reusable response your team can insert in one click.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sr-title">Title</Label>
              <Input
                id="sr-title"
                placeholder="e.g. Greeting"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-content">Reply message</Label>
              <Textarea
                id="sr-content"
                placeholder="Type the response your agents will send..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-shortcut">Shortcut (optional)</Label>
              <Input
                id="sr-shortcut"
                placeholder="/hi"
                value={form.shortcut}
                onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                A short code that triggers this reply. Must start with /.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create reply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this saved reply?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The reply will be removed from your team&apos;s inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
