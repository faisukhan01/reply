import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * GET /api/conversations
 * Query params:
 *   - status: "AI" | "HUMAN" | "CLOSED"  (optional filter)
 *   - q: string                          (optional search on visitor name/email)
 *
 * Returns the conversations belonging to the current user's org chatbot,
 * ordered by updatedAt desc. Each item includes lastMessage + messageCount.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.toUpperCase();
  const q = searchParams.get("q")?.trim();

  // Resolve the org's chatbot(s) — typically one per org for now.
  const chatbots = await db.chatbot.findMany({
    where: { orgId: user.orgId },
    select: { id: true },
  });
  if (chatbots.length === 0) {
    return NextResponse.json({ conversations: [] });
  }
  const chatbotIds = chatbots.map((b) => b.id);

  const where: {
    chatbotId: { in: string[] };
    status?: string;
    OR?: Array<Record<string, unknown>>;
  } = {
    chatbotId: { in: chatbotIds },
  };

  if (status && ["AI", "HUMAN", "CLOSED"].includes(status)) {
    where.status = status;
  }

  if (q) {
    where.OR = [
      { visitorName: { contains: q } },
      { visitorEmail: { contains: q } },
      { visitorId: { contains: q } },
    ];
  }

  const conversations = await db.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true, createdAt: true },
      },
      _count: { select: { messages: true } },
    },
  });

  const result = conversations.map((c) => {
    const last = c.messages[0];
    return {
      id: c.id,
      visitorName: c.visitorName,
      visitorEmail: c.visitorEmail,
      visitorId: c.visitorId,
      status: c.status,
      channel: c.channel,
      satisfaction: c.satisfaction,
      assignedToId: c.assignedToId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      lastMessage: last
        ? {
            content: last.content,
            role: last.role,
            createdAt: last.createdAt,
          }
        : null,
      messageCount: c._count.messages,
    };
  });

  return NextResponse.json({ conversations: result });
}
