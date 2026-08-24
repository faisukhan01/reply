import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ConnectionsView } from "./connections-view";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let connections: any[] = [];
  let platformsStatus: any[] = [];
  let dbDown = false;

  try {
    connections = await db.platformConnection.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, platform: true, accountId: true, accountName: true,
        accountHandle: true, status: true, tokenExpiresAt: true, createdAt: true,
      },
    });
  } catch (err) {
    console.error("[/connections] query failed:", err);
    dbDown = true;
  }

  try {
    const { listAdapters } = await import("@/lib/platforms");
    platformsStatus = listAdapters().map((a) => {
      const missing = a.validateEnvConfig?.() ?? [];
      return {
        id: a.id,
        name: a.name,
        usesOAuth: a.usesOAuth,
        configured: missing.length === 0,
        missingEnvVars: missing,
      };
    });
  } catch (err) {
    console.error("[/connections] adapter list failed:", err);
  }

  return (
    <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
      <ConnectionsView
        connections={connections}
        platformsStatus={platformsStatus}
        dbDown={dbDown}
      />
    </Suspense>
  );
}
