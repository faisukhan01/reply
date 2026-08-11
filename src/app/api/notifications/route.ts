import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bot = await db.chatbot.findFirst({ where: { orgId: user.orgId } });
  if (!bot) return NextResponse.json({ notifications: [], unread: 0 });

  // Recent conversations as notifications (last 6, most recent first)
  const recent = await db.conversation.findMany({
    where: { chatbotId: bot.id },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const notifications = recent.map((c) => {
    const lastMsg = c.messages[0];
    const type =
      c.status === "HUMAN"
        ? "takeover"
        : lastMsg?.role === "VISITOR"
        ? "new_message"
        : "ai_reply";
    return {
      id: c.id,
      type,
      visitorName: c.visitorName || "Visitor",
      preview: lastMsg?.content?.slice(0, 80) || "New conversation started",
      conversationId: c.id,
      createdAt: c.updatedAt.toISOString(),
      read: false,
    };
  });

  // Unread = conversations updated in last 10 minutes that aren't closed
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const unreadCount = await db.conversation.count({
    where: {
      chatbotId: bot.id,
      status: { not: "CLOSED" },
      updatedAt: { gte: tenMinAgo },
    },
  });

  return NextResponse.json({ notifications, unread: unreadCount });
}
