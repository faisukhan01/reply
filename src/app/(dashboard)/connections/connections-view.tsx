"use client";

import { useState } from "react";
import { Plug, Trash2, Loader2, Check, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Connection = {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  accountHandle: string | null;
  status: string;
  tokenExpiresAt: string | null;
  createdAt: string;
};

type PlatformStatus = {
  id: string;
  name: string;
  usesOAuth: boolean;
  configured: boolean;
  missingEnvVars: string[];
};

export function ConnectionsView({
  connections: initialConnections,
  platformsStatus,
  dbDown,
}: {
  connections: Connection[];
  platformsStatus: PlatformStatus[];
  dbDown: boolean;
}) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waAccessToken, setWaAccessToken] = useState("");

  function startOAuth(platform: string) {
    setConnecting(platform);
    // Full navigation to start the OAuth flow — server redirects to the
    // platform's authorize URL.
    window.location.href = `/api/connections/${platform}/connect`;
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this platform? Existing scheduled messages tied to it will fail until you reconnect.")) return;
    const res = await fetch(`/api/connections/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Disconnected.");
      setConnections((c) => c.map((x) => x.id === id ? { ...x, status: "REVOKED" } : x));
    } else {
      toast.error("Failed to disconnect.");
    }
  }

  async function submitWhatsApp() {
    setConnecting("WHATSAPP");
    try {
      const res = await fetch("/api/connections/WHATSAPP/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: waPhoneNumberId, accessToken: waAccessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to connect WhatsApp.");
        setConnecting(null);
        return;
      }
      toast.success("WhatsApp connected.");
      setWaDialogOpen(false);
      setWaPhoneNumberId("");
      setWaAccessToken("");
      const listRes = await fetch("/api/connections");
      const listData = await listRes.json();
      if (listData.connections) setConnections(listData.connections);
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setConnecting(null);
    }
  }

  return (
    <div className="space-y-6">
      {dbDown && (
        <div className="rounded-md border border-amber-200/60 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
          <div>
            Database is unreachable. You can still browse the platform setup
            instructions, but existing connections won&apos;t load. Generate a
            fresh Turso DB token in Vercel env vars to fix this.
          </div>
        </div>
      )}

      {/* Available platforms */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b">
          <h2 className="text-sm font-medium">Available platforms</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect each platform once. OAuth tokens are encrypted at rest
            (AES-256-GCM) and stored in your database.
          </p>
        </div>
        <div className="divide-y">
          {platformsStatus.map((p) => {
            const alreadyConnected = connections.some(
              (c) => c.platform === p.id && c.status === "ACTIVE"
            );
            return (
              <div key={p.id} className="px-5 py-4 flex items-start gap-4">
                <div className="h-9 w-9 rounded-md border bg-muted/40 flex items-center justify-center shrink-0">
                  <Plug className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{p.name}</h3>
                    {alreadyConnected && (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent">
                        Connected
                      </span>
                    )}
                  </div>
                  {p.configured ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.usesOAuth
                        ? "Click Connect to start the OAuth flow."
                        : "Click Connect to enter your API credentials."}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-destructive">
                      Missing env vars: {p.missingEnvVars.join(", ")}. Set
                      them in Vercel → Settings → Environment Variables,
                      then redeploy.
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {p.usesOAuth ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!p.configured || connecting === p.id}
                      onClick={() => startOAuth(p.id)}
                    >
                      {connecting === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Connect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWaDialogOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {platformsStatus.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No platforms registered. Check that adapters loaded correctly.
            </div>
          )}
        </div>
      </div>

      {/* Existing connections */}
      {connections.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-medium">Connected accounts</h2>
          </div>
          <div className="divide-y">
            {connections.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.accountName}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border-transparent">
                      {c.platform}
                    </span>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border-transparent ${
                      c.status === "ACTIVE" ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
                      c.status === "REVOKED" ? "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300" :
                      "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {c.accountHandle && <span>{c.accountHandle} · </span>}
                    Connected {new Date(c.createdAt).toLocaleDateString()}
                    {c.tokenExpiresAt && (
                      <> · Token expires {new Date(c.tokenExpiresAt).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => disconnect(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp credentials dialog */}
      <Dialog open={waDialogOpen} onOpenChange={setWaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect WhatsApp Business</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Get these from your Meta Business Manager: WhatsApp Manager →
              Phone Numbers → your number → &quot;Phone number ID&quot; and a
              permanent System User access token with{" "}
              <code>whatsapp_business_messaging</code> permission.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone" className="text-xs">Phone Number ID</Label>
              <Input
                id="wa-phone"
                value={waPhoneNumberId}
                onChange={(e) => setWaPhoneNumberId(e.target.value)}
                placeholder="e.g. 123456789012345"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-token" className="text-xs">Permanent Access Token</Label>
              <Input
                id="wa-token"
                type="password"
                value={waAccessToken}
                onChange={(e) => setWaAccessToken(e.target.value)}
                placeholder="EAAG..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitWhatsApp}
              disabled={!waPhoneNumberId || !waAccessToken || connecting === "WHATSAPP"}
            >
              {connecting === "WHATSAPP" ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1.5" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
