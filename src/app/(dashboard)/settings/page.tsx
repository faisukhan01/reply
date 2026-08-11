"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Crown,
  CreditCard,
  Bell,
  AlertTriangle,
  Check,
  Loader2,
  UserPlus,
  Users,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
};

const planBadge: Record<string, { label: string; className: string }> = {
  FREE: {
    label: "Free",
    className: "bg-muted text-muted-foreground",
  },
  STARTER: {
    label: "Starter",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  PRO: {
    label: "Pro",
    className:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  SCALE: {
    label: "Scale",
    className:
      "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
  },
};

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

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [orgName, setOrgName] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);

  // invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "AGENT",
  });

  // notifications
  const [notif, setNotif] = useState({
    newConversation: true,
    dailySummary: true,
    lowSatisfaction: false,
    weeklyReport: true,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      const o: OrgInfo = data.org;
      setOrg(o);
      setOrgName(o.name);
      setMembers(Array.isArray(o.users) ? (o.users as Member[]) : []);
    } catch (e) {
      toast.error("Could not load organization settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim() || orgName.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setSavingOrg(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to update");
      }
      const { org: updated } = await res.json();
      setOrg(updated);
      toast.success("Organization updated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      toast.error(msg);
    } finally {
      setSavingOrg(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch("/api/settings/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteForm.name.trim(),
          email: inviteForm.email.trim(),
          password: inviteForm.password,
          role: inviteForm.role,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to invite");
      }
      const { user } = await res.json();
      setMembers((prev) => [...prev, user as Member]);
      toast.success(`${user.name} added as ${user.role}`);
      setInviteForm({ name: "", email: "", password: "", role: "AGENT" });
      setInviteOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to invite member";
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  }

  const planLabel = org
    ? planBadge[org.plan]?.label ?? org.plan
    : "";
  const planClass = org
    ? planBadge[org.plan]?.className ?? ""
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization, team, billing, and preferences.
          </p>
        </div>
      </div>

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto sm:h-9">
          <TabsTrigger value="organization">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Danger</span>
          </TabsTrigger>
        </TabsList>

        {/* Organization */}
        <TabsContent value="organization" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-xl border shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Organization profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveOrg} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Organization name</Label>
                      <Input
                        id="org-name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Inc."
                      />
                      <p className="text-xs text-muted-foreground">
                        This name appears in your sidebar and on customer-facing
                        widget headers.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-slug">Workspace slug</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="org-slug"
                          value={org?.slug ?? ""}
                          readOnly
                          className="bg-muted/40 font-mono text-sm"
                        />
                        <Badge variant="outline" className="shrink-0">
                          Read-only
                        </Badge>
                      </div>
                    </div>
                    <Button type="submit" disabled={savingOrg}>
                      {savingOrg ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Save changes
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="h-4 w-4 text-violet-500" />
                  Current plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Badge className={planClass}>{planLabel}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Since {org ? formatDate(org.createdAt) : "—"}
                      </span>
                    </div>
                    <Separator />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium">{planLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Org ID</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {org?.id.slice(0, 12)}…
                        </span>
                      </div>
                    </div>
                    {org?.plan !== "SCALE" && (
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() =>
                          toast.info("Redirect to billing to upgrade")
                        }
                      >
                        <Crown className="h-4 w-4" />
                        Upgrade plan
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="mt-4">
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Team members</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Invite teammates to collaborate on conversations.
                </p>
              </div>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4" />
                    Invite member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite team member</DialogTitle>
                    <DialogDescription>
                      Create a new account for a teammate. They&apos;ll be able
                      to log in with these credentials.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="m-name">
                        Full name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="m-name"
                        placeholder="Alex Morgan"
                        value={inviteForm.name}
                        onChange={(e) =>
                          setInviteForm((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="m-email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="m-email"
                        type="email"
                        placeholder="alex@acme.com"
                        value={inviteForm.email}
                        onChange={(e) =>
                          setInviteForm((p) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="m-password">
                        Temporary password{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="m-password"
                        type="password"
                        placeholder="Min 6 characters"
                        value={inviteForm.password}
                        onChange={(e) =>
                          setInviteForm((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="m-role">Role</Label>
                      <Select
                        value={inviteForm.role}
                        onValueChange={(v) =>
                          setInviteForm((p) => ({ ...p, role: v }))
                        }
                      >
                        <SelectTrigger id="m-role" className="w-full">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AGENT">Agent</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Agents handle conversations. Admins can also manage
                        settings & billing.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInviteOpen(false)}
                        disabled={inviting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={inviting}>
                        {inviting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Inviting…
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Invite
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-4 flex-1 max-w-[160px]" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No team members yet. Invite your first teammate.
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="pl-4">Member</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Email
                        </TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Joined
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-semibold">
                                  {initials(m.name) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{m.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {m.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                m.role === "OWNER" ? "default" : "secondary"
                              }
                              className={
                                m.role === "ADMIN"
                                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                                  : ""
                              }
                            >
                              {m.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {formatDate(m.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-xl border shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-violet-500" />
                  Current plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 border">
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <span className="font-semibold">Pro plan</span>
                      <Badge className="bg-violet-600 text-white">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Up to 10,000 conversations/mo, full analytics, priority
                      email support.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">$79</div>
                    <div className="text-xs text-muted-foreground">/ month</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Usage this cycle</h4>
                  <div className="space-y-4">
                    <UsageBar
                      label="Conversations"
                      used={2840}
                      limit={10000}
                      display={`${(2840).toLocaleString()} / 10,000`}
                    />
                    <UsageBar
                      label="Knowledge documents"
                      used={6}
                      limit={25}
                      display="6 / 25"
                    />
                    <UsageBar
                      label="Team seats"
                      used={members.length}
                      limit={10}
                      display={`${members.length} / 10`}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Opening billing portal…")}
                  >
                    <CreditCard className="h-4 w-4" />
                    Manage payment
                  </Button>
                  <Button size="sm">
                    <Crown className="h-4 w-4" />
                    Upgrade to Scale
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scale plan CTA */}
            <Card className="rounded-xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles /> Scale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-3xl font-bold">
                  $199
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </div>
                <ul className="space-y-2">
                  {[
                    "Unlimited conversations",
                    "Unlimited team seats",
                    "Custom branding & domain",
                    "Priority 24/7 support",
                    "Advanced AI fine-tuning",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="sm">
                  Upgrade to Scale
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Invoices */}
          <Card className="rounded-xl border shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="text-base">Invoice history</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="pl-4">Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right pr-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {INVOICES.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="pl-4 font-mono text-xs">
                          {inv.id}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inv.date}
                        </TableCell>
                        <TableCell className="text-sm">{inv.amount}</TableCell>
                        <TableCell className="text-right pr-4">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            <Check className="h-3 w-3" />
                            Paid
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="rounded-xl border shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-violet-500" />
                Notification preferences
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Choose what we email you about.
              </p>
            </CardHeader>
            <CardContent className="space-y-1">
              <NotifRow
                title="New conversation email"
                description="Get an email when a new conversation starts."
                checked={notif.newConversation}
                onChecked={(v) =>
                  setNotif((p) => ({ ...p, newConversation: v }))
                }
              />
              <Separator />
              <NotifRow
                title="Daily summary"
                description="A daily digest of yesterday's activity."
                checked={notif.dailySummary}
                onChecked={(v) =>
                  setNotif((p) => ({ ...p, dailySummary: v }))
                }
              />
              <Separator />
              <NotifRow
                title="Low satisfaction alert"
                description="Alert me when a conversation gets a rating below 3."
                checked={notif.lowSatisfaction}
                onChecked={(v) =>
                  setNotif((p) => ({ ...p, lowSatisfaction: v }))
                }
              />
              <Separator />
              <NotifRow
                title="Weekly report"
                description="A weekly performance report every Monday."
                checked={notif.weeklyReport}
                onChecked={(v) =>
                  setNotif((p) => ({ ...p, weeklyReport: v }))
                }
              />
              <div className="pt-4">
                <Button
                  size="sm"
                  onClick={() => toast.success("Notification preferences saved")}
                >
                  <Check className="h-4 w-4" />
                  Save preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger zone */}
        <TabsContent value="danger" className="mt-4">
          <Card className="rounded-xl border border-destructive/30 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Danger zone
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Irreversible actions. Proceed with caution.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <div>
                  <div className="font-medium text-sm">Delete organization</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Permanently delete this organization, all conversations,
                    contacts, and team members. This cannot be undone.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="shrink-0">
                      <Trash2 className="h-4 w-4" />
                      Delete account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action is irreversible. Please contact our support
                        team to verify ownership before we delete your account
                        and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() =>
                          toast.info(
                            "Contact support to delete your account — we've logged your request."
                          )
                        }
                      >
                        I understand
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border">
                <div>
                  <div className="font-medium text-sm">Export all data</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Download a JSON archive of your organization&apos;s data.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    toast.info("Export will be emailed when ready")
                  }
                >
                  Request export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
  display,
}: {
  label: string;
  used: number;
  limit: number;
  display: string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{display}</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function NotifRow({
  title,
  description,
  checked,
  onChecked,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChecked: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {description}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChecked} />
    </div>
  );
}

function Sparkles() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white">
      <Crown className="h-3.5 w-3.5" />
    </span>
  );
}

const INVOICES = [
  { id: "INV-2024-003", date: "Jul 1, 2024", amount: "$79.00" },
  { id: "INV-2024-002", date: "Jun 1, 2024", amount: "$79.00" },
  { id: "INV-2024-001", date: "May 1, 2024", amount: "$79.00" },
];
