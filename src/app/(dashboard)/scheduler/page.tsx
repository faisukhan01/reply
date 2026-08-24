import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { SchedulerView } from "./scheduler-view";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SchedulerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let connections: {
    id: string;
    platform: string;
    accountName: string;
    accountHandle: string | null;
    status: string;
  }[] = [];
  let messages: any[] = [];

  try {
    connections = await db.platformConnection.findMany({
      where: { orgId: user.orgId, status: "ACTIVE" },
      select: {
        id: true, platform: true, accountName: true, accountHandle: true, status: true,
      },
      orderBy: { platform: "asc" },
    });
  } catch (err) {
    console.error("[/scheduler] connections query failed:", err);
  }

  try {
    messages = await db.scheduledMessage.findMany({
      where: { orgId: user.orgId },
      orderBy: { scheduledFor: "desc" },
      take: 100,
      select: {
        id: true, connectionId: true, platform: true,
        recipientId: true, recipientHandle: true, content: true,
        scheduledFor: true, status: true, attempts: true,
        lastError: true, sentAt: true, createdAt: true,
        connection: { select: { accountName: true, accountHandle: true } },
      },
    });
  } catch (err) {
    console.error("[/scheduler] messages query failed:", err);
  }

  return (
    <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
      <SchedulerView
        connections={connections.map((c) => ({
          id: c.id,
          platform: c.platform,
          accountName: c.accountName,
          accountHandle: c.accountHandle,
          status: c.status as "ACTIVE",
        }))}
        messages={messages}
      />
    </Suspense>
  );
}
