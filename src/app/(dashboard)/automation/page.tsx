import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { AutomationView } from "./automation-view";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let dbDown = false;
  try {
    // Light touch — verify DB connectivity by counting rules (0 if none)
    await db.automationRule.count({ where: { orgId: user.orgId } });
  } catch (err) {
    console.error("[/automation] DB error:", err);
    dbDown = true;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
        <p className="text-sm text-muted-foreground">
          Define rules that fire when customers message you on any connected
          platform. Each rule can auto-reply, escalate, or schedule follow-ups.
        </p>
      </header>

      <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
        <AutomationView dbDown={dbDown} />
      </Suspense>
    </div>
  );
}
