import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type AnalyticsResponse = {
  totalConversations: number;
  aiHandled: number;
  humanHandled: number;
  resolutionRate: number;
  avgSatisfaction: number;
  totalContacts: number;
  totalMessages: number;
  conversationsTrend: { date: string; count: number }[];
  satisfactionTrend: { date: string; avg: number }[];
  statusBreakdown: { ai: number; human: number; closed: number };
  topQuestions: { question: string; count: number }[];
};

function empty(): AnalyticsResponse {
  return {
    totalConversations: 0,
    aiHandled: 0,
    humanHandled: 0,
    resolutionRate: 0,
    avgSatisfaction: 0,
    totalContacts: 0,
    totalMessages: 0,
    conversationsTrend: [],
    satisfactionTrend: [],
    statusBreakdown: { ai: 0, human: 0, closed: 0 },
    topQuestions: [],
  };
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = user.orgId;

  const bot = await db.chatbot.findFirst({ where: { orgId } });
  if (!bot) {
    return NextResponse.json(empty());
  }

  const chatbotId = bot.id;

  // Aggregate counts in parallel
  const [
    totalConversations,
    aiHandled,
    humanHandled,
    closedHandled,
    satisfactionAgg,
    totalContacts,
    totalMessages,
    recentConversations,
    satisfactionRecent,
    firstVisitorMessages,
  ] = await Promise.all([
    db.conversation.count({ where: { chatbotId } }),
    db.conversation.count({ where: { chatbotId, status: "AI" } }),
    db.conversation.count({ where: { chatbotId, status: "HUMAN" } }),
    db.conversation.count({ where: { chatbotId, status: "CLOSED" } }),
    db.conversation.aggregate({
      where: { chatbotId, satisfaction: { not: null } },
      _avg: { satisfaction: true },
    }),
    db.contact.count({ where: { orgId } }),
    db.message.count({
      where: { conversation: { chatbotId } },
    }),
    // conversations created in last 14 days (for trend)
    db.conversation.findMany({
      where: {
        chatbotId,
        createdAt: {
          gte: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
        },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // satisfaction for last 7 days trend
    db.conversation.findMany({
      where: {
        chatbotId,
        satisfaction: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
      },
      select: { createdAt: true, satisfaction: true },
      orderBy: { createdAt: "asc" },
    }),
    // First VISITOR message per conversation (for top questions)
    db.message.findMany({
      where: {
        conversation: { chatbotId },
        role: "VISITOR",
      },
      select: {
        id: true,
        conversationId: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Build 14-day trend (oldest → today)
  const conversationsTrend: { date: string; count: number }[] = [];
  const trendMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    trendMap.set(dayKey(d), 0);
  }
  for (const c of recentConversations) {
    const k = dayKey(c.createdAt);
    if (trendMap.has(k)) trendMap.set(k, (trendMap.get(k) ?? 0) + 1);
  }
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    conversationsTrend.push({ date: k, count: trendMap.get(k) ?? 0 });
  }

  // Build 7-day satisfaction trend
  const satisfactionTrend: { date: string; avg: number }[] = [];
  const satMap = new Map<string, { sum: number; count: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    satMap.set(dayKey(d), { sum: 0, count: 0 });
  }
  for (const c of satisfactionRecent) {
    const k = dayKey(c.createdAt);
    const entry = satMap.get(k);
    if (entry && c.satisfaction != null) {
      entry.sum += c.satisfaction;
      entry.count += 1;
    }
  }
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const entry = satMap.get(k) ?? { sum: 0, count: 0 };
    const avg = entry.count > 0 ? entry.sum / entry.count : 0;
    satisfactionTrend.push({
      date: k,
      avg: Math.round(avg * 10) / 10,
    });
  }

  // Top questions — first VISITOR message per conversation
  const firstMsgByConv = new Map<string, string>();
  for (const m of firstVisitorMessages) {
    if (!firstMsgByConv.has(m.conversationId)) {
      firstMsgByConv.set(m.conversationId, m.content.trim());
    }
  }
  const qCount = new Map<string, number>();
  for (const q of firstMsgByConv.values()) {
    const key = q.length > 80 ? q.slice(0, 80) + "…" : q;
    qCount.set(key, (qCount.get(key) ?? 0) + 1);
  }
  const topQuestions = Array.from(qCount.entries())
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const humanTotal = humanHandled + closedHandled;
  const resolutionRate =
    totalConversations > 0
      ? Math.round((aiHandled / totalConversations) * 100)
      : 0;
  const avgSatisfaction =
    satisfactionAgg._avg.satisfaction != null
      ? Math.round(satisfactionAgg._avg.satisfaction * 10) / 10
      : 0;

  return NextResponse.json({
    totalConversations,
    aiHandled,
    humanHandled: humanTotal,
    resolutionRate,
    avgSatisfaction,
    totalContacts,
    totalMessages,
    conversationsTrend,
    satisfactionTrend,
    statusBreakdown: {
      ai: aiHandled,
      human: humanHandled,
      closed: closedHandled,
    },
    topQuestions,
  } satisfies AnalyticsResponse);
}
