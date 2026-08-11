"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Mail,
  Phone,
  Download,
  Loader2,
  Plus,
  X,
  LayoutGrid,
  List as ListIcon,
  MessageSquare,
  Pencil,
  ExternalLink,
  Globe,
  Code2,
  User,
  Inbox,
  Calendar,
  StickyNote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  notes: string | null;
  createdAt: string;
  conversationCount?: number;
  lastSeenAt?: string | null;
};

type ContactDetail = {
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    source: string;
    notes: string | null;
    createdAt: string;
  };
  conversations: Array<{
    id: string;
    visitorName: string | null;
    status: string;
    updatedAt: string;
    lastMessage: string | null;
  }>;
};

type SourceKey = "ALL" | "WIDGET" | "API" | "MANUAL";
type SortKey = "name-asc" | "name-desc" | "newest" | "most-convos";
type ViewMode = "list" | "grid";

const sourceVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  WIDGET: "default",
  MANUAL: "secondary",
  IMPORT: "outline",
  API: "outline",
};

const sourceIcon: Record<string, typeof Globe> = {
  WIDGET: Globe,
  API: Code2,
  MANUAL: User,
  IMPORT: Download,
};

const sourceColor: Record<string, string> = {
  WIDGET:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  API: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  MANUAL:
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  IMPORT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [view, setView] = useState<ViewMode>("list");
  const [sourceFilter, setSourceFilter] = useState<SourceKey>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  // Detail drawer state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit dialog state (opened from drawer OR from grid hover)
  const [editOpen, setEditOpen] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Add contact dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const fetchContacts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to load contacts");
      const data = await res.json();
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    } catch (e) {
      toast.error("Could not load contacts");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts(debouncedQuery);
  }, [debouncedQuery, fetchContacts]);

  // Apply client-side source filter + sort
  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (sourceFilter !== "ALL") {
      list = list.filter((c) => c.source === sourceFilter);
    }
    list = [...list];
    switch (sortBy) {
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "most-convos":
        list.sort(
          (a, b) => (b.conversationCount ?? 0) - (a.conversationCount ?? 0)
        );
        break;
    }
    return list;
  }, [contacts, sourceFilter, sortBy]);

  const filteredCount = filteredContacts.length;

  // Fetch detail when drawer opens
  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    fetch(`/api/contacts/${detailId}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setDetail(data as ContactDetail);
        // Pre-fill edit form
        const c = (data as ContactDetail).contact;
        setEditForm({
          name: c.name,
          email: c.email ?? "",
          phone: c.phone ?? "",
          notes: c.notes ?? "",
        });
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load contact detail");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to add contact");
      }
      const { contact } = await res.json();
      setContacts((prev) => [contact as Contact, ...prev]);
      toast.success("Contact added");
      setForm({ name: "", email: "", phone: "", notes: "" });
      setAddOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add contact";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  }

  // Open the edit dialog for a given contact (works from grid hover OR drawer)
  function openEdit(c: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
  }) {
    setEditContactId(c.id);
    setEditForm({
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      notes: c.notes ?? "",
    });
    setEditOpen(true);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editContactId) return;
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${editContactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim() || undefined,
          phone: editForm.phone.trim() || undefined,
          notes: editForm.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to update contact");
      }
      const { contact: updated } = await res.json();
      // Update local list
      setContacts((prev) =>
        prev.map((c) =>
          c.id === updated.id
            ? {
                ...c,
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
                notes: updated.notes,
              }
            : c
        )
      );
      // Update detail panel
      if (detail) {
        setDetail({
          ...detail,
          contact: { ...detail.contact, ...updated },
        });
      }
      toast.success("Contact updated");
      setEditOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update contact";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to delete contact");
      }
      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success("Contact deleted");
      // If currently open in drawer, close it
      if (detailId === deleteTarget.id) {
        setDetailId(null);
      }
      setDeleteTarget(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete contact";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  function handleExportCsv() {
    if (contacts.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const header = ["Name", "Email", "Phone", "Source", "Notes", "Created"];
    const rows = contacts.map((c) =>
      [
        c.name,
        c.email ?? "",
        c.phone ?? "",
        c.source,
        c.notes ?? "",
        formatDate(c.createdAt),
      ]
        .map((v) => escapeCsv(String(v)))
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${contacts.length} contacts`);
  }

  const isFiltered = useMemo(
    () => debouncedQuery.trim().length > 0 || sourceFilter !== "ALL",
    [debouncedQuery, sourceFilter]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              Manage leads and customer contact info.
            </p>
          </div>
          {!loading && (
            <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
              {filteredCount} {filteredCount === 1 ? "contact" : "contacts"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={loading || contacts.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4" />
                Add contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add new contact</DialogTitle>
                <DialogDescription>
                  Create a contact or lead manually. They&apos;ll appear in your
                  contacts list immediately.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="c-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="c-name"
                    placeholder="Jane Cooper"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    autoFocus
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="c-email">Email</Label>
                    <Input
                      id="c-email"
                      type="email"
                      placeholder="jane@acme.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-phone">Phone</Label>
                    <Input
                      id="c-phone"
                      placeholder="+1 (555) 012-3456"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-notes">Notes</Label>
                  <Textarea
                    id="c-notes"
                    placeholder="VIP customer, interested in Pro plan…"
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                    disabled={adding}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={adding}>
                    {adding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Save contact
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + filters + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search with clear button */}
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Source filter */}
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as SourceKey)}
          >
            <SelectTrigger size="sm" className="w-[150px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              <SelectItem value="WIDGET">Widget</SelectItem>
              <SelectItem value="API">API</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortKey)}
          >
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="most-convos">Most conversations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View toggle */}
        <div className="inline-flex shrink-0 items-center rounded-md border bg-muted/40 p-0.5">
          <button
            type="button"
            aria-label="List view"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-[5px] text-muted-foreground transition-colors",
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            )}
          >
            <ListIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => setView("grid")}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-[5px] text-muted-foreground transition-colors",
              view === "grid"
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table / Grid / Empty / Loading */}
      {loading ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-xl border shadow-sm p-0 overflow-hidden">
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 flex-1 max-w-[160px]" />
                  <Skeleton className="h-4 flex-1 max-w-[200px]" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </Card>
        )
      ) : contacts.length === 0 ? (
        <EmptyContactsState
          isFiltered={isFiltered}
          onAdd={() => setAddOpen(true)}
        />
      ) : view === "grid" ? (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredContacts.map((c) => (
              <ContactGridCard
                key={c.id}
                contact={c}
                onView={() => setDetailId(c.id)}
                onEdit={() => openEdit(c)}
                onDelete={() => setDeleteTarget(c)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <Card className="rounded-xl border shadow-sm p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-violet-50/50 dark:hover:bg-violet-500/5"
                  onClick={() => setDetailId(c.id)}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-semibold">
                          {initials(c.name) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate max-w-[180px]">
                          {c.name}
                        </div>
                        {c.notes && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {c.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[180px]">
                          {c.email}
                        </span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.phone ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {c.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={c.source} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-violet-600 hover:bg-violet-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailId(c.id);
                        }}
                        aria-label={`View ${c.name}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(c);
                        }}
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Contact detail drawer (Sheet) */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader className="pb-2">
            <SheetDescription className="sr-only">
              Contact detail
            </SheetDescription>
            {detailLoading || !detail ? (
              <div className="flex items-center gap-4 pt-2">
                <Skeleton className="size-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-44" />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 pt-2">
                <Avatar className="size-16 ring-4 ring-violet-200/60 dark:ring-violet-500/30">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-lg font-bold">
                    {initials(detail.contact.name) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-xl truncate">
                    {detail.contact.name}
                  </SheetTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <SourceBadge source={detail.contact.source} />
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="size-3" />
                      Added {formatDate(detail.contact.createdAt)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </SheetHeader>

          {detail && !detailLoading && (
            <div className="space-y-5 px-4 pb-8">
              {/* Contact fields */}
              <div className="grid gap-3 rounded-xl border bg-muted/30 p-3">
                <DetailField
                  icon={Mail}
                  label="Email"
                  value={
                    detail.contact.email ? (
                      <a
                        href={`mailto:${detail.contact.email}`}
                        className="text-violet-600 dark:text-violet-300 hover:underline"
                      >
                        {detail.contact.email}
                      </a>
                    ) : null
                  }
                />
                <DetailField
                  icon={Phone}
                  label="Phone"
                  value={detail.contact.phone}
                />
                <DetailField
                  icon={StickyNote}
                  label="Notes"
                  value={detail.contact.notes}
                  multiline
                />
                <DetailField
                  icon={Calendar}
                  label="Member since"
                  value={format(detail.contact.createdAt, "MMM d, yyyy")}
                />
              </div>

              {/* Conversation history */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Conversations
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      ({detail.conversations.length})
                    </span>
                  </h3>
                </div>
                {detail.conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-6 text-center">
                    <Inbox className="size-6 text-muted-foreground/60" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      No conversations linked to this contact.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-72 space-y-2 overflow-y-auto scroll-thin pr-1">
                    {detail.conversations.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/conversations?id=${c.id}`}
                          className="group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-500/5"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                            <MessageSquare className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {c.visitorName ?? "Anonymous visitor"}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {relativeTime(c.updatedAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {c.lastMessage ?? "No messages yet"}
                            </p>
                          </div>
                          <StatusMiniBadge status={c.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(detail.contact)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setDeleteTarget(
                      contacts.find((c) => c.id === detailId) ?? null
                    );
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit dialog (top-level — opens from grid hover or drawer) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
            <DialogDescription>
              Update this contact&apos;s details. Changes save instantly.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="e-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
                autoFocus
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="e-email">Email</Label>
                <Input
                  id="e-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-phone">Phone</Label>
                <Input
                  id="e-phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-notes">Notes</Label>
              <Textarea
                id="e-notes"
                rows={3}
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              from your contacts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Source badge with icon + tone color */
function SourceBadge({ source }: { source: string }) {
  const Icon = sourceIcon[source] ?? User;
  const color = sourceColor[source] ?? "";
  return (
    <Badge
      variant={sourceVariant[source] ?? "outline"}
      className={cn("gap-1 border-transparent", color)}
    >
      <Icon className="size-3" />
      {source}
    </Badge>
  );
}

/** Mini status badge for conversations inside drawer */
function StatusMiniBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    AI: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    HUMAN:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    CLOSED:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        map[status] ?? map.CLOSED
      )}
    >
      {status}
    </span>
  );
}

/** Detail row in drawer */
function DetailField({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}) {
  const isEmpty = !value;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "text-sm text-foreground",
            multiline ? "whitespace-pre-wrap break-words" : "truncate",
            isEmpty && "text-muted-foreground italic"
          )}
        >
          {isEmpty ? "—" : value}
        </div>
      </div>
    </div>
  );
}

/** Empty state for contacts page with gradient background */
function EmptyContactsState({
  isFiltered,
  onAdd,
}: {
  isFiltered: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-violet-200/60 dark:border-violet-500/20 bg-gradient-to-br from-violet-50/80 via-fuchsia-50/50 to-transparent dark:from-violet-500/10 dark:via-fuchsia-500/5 dark:to-transparent px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-500/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-12 size-48 rounded-full bg-fuchsia-200/40 blur-3xl dark:bg-fuchsia-500/10"
      />
      <div className="relative flex flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-violet-200/60 dark:bg-violet-500/10 dark:ring-violet-500/20">
          <Users className="h-8 w-8 text-violet-600 dark:text-violet-300" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          {isFiltered ? "No matches found" : "No contacts yet"}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {isFiltered
            ? "Try a different search term or filter, or clear the filters to see everyone."
            : "Add your first contact to start building your CRM. You can also let visitors leave their info through the chatbot widget."}
        </p>
        {!isFiltered && (
          <Button className="mt-4" size="sm" onClick={onAdd}>
            <UserPlus className="h-4 w-4" />
            Add your first contact
          </Button>
        )}
      </div>
    </div>
  );
}

/** Grid view contact card with hover quick actions */
function ContactGridCard({
  contact,
  onView,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group relative overflow-hidden rounded-xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10 hover:ring-1 hover:ring-violet-300/60 dark:hover:ring-violet-500/40"
        role="button"
        tabIndex={0}
        onClick={onView}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView();
          }
        }}
      >
        {/* Gradient ring backdrop for avatar */}
        <div className="pointer-events-none absolute -top-12 right-0 size-32 rounded-full bg-gradient-to-br from-violet-200/40 to-fuchsia-200/40 blur-2xl transition-opacity group-hover:opacity-100 dark:from-violet-500/15 dark:to-fuchsia-500/15" />

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 opacity-60 blur-[2px] dark:from-violet-500 dark:to-fuchsia-500" />
              <Avatar className="relative size-12 ring-2 ring-background">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-bold">
                  {initials(contact.name) || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
            <SourceBadge source={contact.source} />
          </div>

          <div className="mt-3 space-y-1">
            <h3 className="truncate text-base font-semibold">{contact.name}</h3>
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-600 dark:hover:text-violet-300"
              >
                <Mail className="size-3" />
                <span className="truncate max-w-[180px]">{contact.email}</span>
              </a>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No email address
              </p>
            )}
          </div>

          {/* Stats footer */}
          <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-violet-500 dark:text-violet-300" />
              <span className="font-medium text-foreground">
                {contact.conversationCount ?? 0}
              </span>
              <span>
                {(contact.conversationCount ?? 0) === 1
                  ? "conversation"
                  : "conversations"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground/70">Last seen</span>
              <span className="font-medium text-foreground">
                {relativeTime(contact.lastSeenAt)}
              </span>
            </span>
          </div>

          {/* Hover quick actions overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-gradient-to-t from-background via-background/95 to-transparent p-3 pt-8 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <ExternalLink className="size-3.5" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
