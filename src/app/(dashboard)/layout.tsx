import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import { ShortcutsDialog } from "@/components/dashboard/shortcuts-dialog";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Get count of active HUMAN conversations for the sidebar badge
  let activeConvCount = 0;
  try {
    const bot = await db.chatbot.findFirst({ where: { orgId: user.orgId } });
    if (bot) {
      activeConvCount = await db.conversation.count({
        where: { chatbotId: bot.id, status: "HUMAN" },
      });
    }
  } catch {
    // Silently fail
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        orgName={user.orgName}
        userName={user.name}
        userRole={user.role}
        activeConvCount={activeConvCount}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userName={user.name} orgName={user.orgName} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 lg:px-10">{children}</main>
      </div>
      <OnboardingModal />
      <ShortcutsDialog />
    </div>
  );
}
