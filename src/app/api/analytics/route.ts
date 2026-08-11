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
  avgResponseTime: number; // seconds, 0 if unknown
  peakHour: number; // 0-23, -1 if no data
  conversationsTrend: { date: string; count: number }[];
  satisfactionTrend: { date: string; avg: number }[];
  hourlyActivity: { hour: number; count: number }[];
  responseTimeDist: { range: string; count: number }[];
  channelBreakdown: { widget: number; api: number; other: number };
  statusBreakdown: { ai: number; human: number; closed: number };
  topQuestions: { question: string; count: number }[];
  // Previous 7-day window metrics for trend indicators
  prev: {
    resolutionRate: number;
    avgSatisfaction: number;
    totalMessages: number;
    avgResponseTime: number;
    totalConversations: number;
  };
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
    avgResponseTime: 0,
    peakHour: -1,
    conversationsTrend: [],
    satisfactionTrend: [],
    hourlyActivity: [],
    responseTimeDist: [],
    channelBreakdown: { widget: 0, api: 0, other: 0 },
    statusBreakdown: { ai: 0, human: 0, closed: 0 },
    topQuestions: [],
    prev: {
      resolutionRate: 0,
      avgSatisfaction: 0,
      totalMessages: 0,
      avgResponseTime: 0,
      totalConversations: 0,
    },
  };
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const now = Date.now();
  const d90 = new Date(now - 90 * DAY_MS);
  const d14 = new Date(now - 13 * DAY_MS);
  const d7 = new Date(now - 7 * DAY_MS);
  const d14ago = new Date(now - 14 * DAY_MS); // start of previous 7-day window
  const d30 = new Date(now - 30 * DAY_MS);

  const [
    totalConversations,
    aiHandled,
    humanHandled,
    closedHandled,
    satisfactionAgg,
    totalContacts,
    totalMessages,
    // 90-day conversations (for trend + hourly + channel breakdown)
    conv90,
    // 14-day conversations with satisfaction (for 14d satisfaction trend)
    sat14,
    // First VISITOR message per conversation (for top questions)
    firstVisitorMessages,
    // All conversations with message counts (for response time distribution)
    convsWithCounts,
    // Channel groupBy across all conversations
    channelGroups,
    // Recent messages (30 days) — for avg response time
    recentMessages,
    // Previous 7-day window aggregates (for trend indicators)
    prevConvCount,
    prevSatAgg,
    prevMsgCount,
    prevAiHandled,
    prevMessages,
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
    db.conversation.findMany({
      where: { chatbotId, createdAt: { gte: d90 } },
      select: { createdAt: true, satisfaction: true, channel: true },
      orderBy: { createdAt: "asc" },
    }),
    db.conversation.findMany({
      where: {
        chatbotId,
        satisfaction: { not: null },
        createdAt: { gte: d14 },
      },
      select: { createdAt: true, satisfaction: true },
      orderBy: { createdAt: "asc" },
    }),
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
    db.conversation.findMany({
      where: { chatbotId },
      select: { _count: { select: { messages: true } } },
    }),
    db.conversation.groupBy({
      by: ["channel"],
      where: { chatbotId },
      _count: { _all: true },
    }),
    // Last 30 days of messages for response-time computation
    db.message.findMany({
      where: {
        conversation: { chatbotId, createdAt: { gte: d30 } },
        role: { in: ["VISITOR", "AI"] },
      },
      select: {
        conversationId: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.conversation.count({
      where: { chatbotId, createdAt: { gte: d14ago, lt: d7 } },
    }),
    db.conversation.aggregate({
      where: {
        chatbotId,
        satisfaction: { not: null },
        createdAt: { gte: d14ago, lt: d7 },
      },
      _avg: { satisfaction: true },
    }),
    db.message.count({
      where: {
        conversation: {
          chatbotId,
          createdAt: { gte: d14ago, lt: d7 },
        },
      },
    }),
    db.conversation.count({
      where: {
        chatbotId,
        status: "AI",
        createdAt: { gte: d14ago, lt: d7 },
      },
    }),
    db.message.findMany({
      where: {
        conversation: {
          chatbotId,
          createdAt: { gte: d14ago, lt: d7 },
        },
        role: { in: ["VISITOR", "AI"] },
      },
      select: { conversationId: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // ─── 90-day conversations trend ───────────────────────────────
  const conversationsTrend: { date: string; count: number }[] = [];
  const trendMap = new Map<string, number>();
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    trendMap.set(dayKey(d), 0);
  }
  for (const c of conv90) {
    const k = dayKey(c.createdAt);
    if (trendMap.has(k)) trendMap.set(k, (trendMap.get(k) ?? 0) + 1);
  }
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    conversationsTrend.push({ date: k, count: trendMap.get(k) ?? 0 });
  }

  // ─── 14-day satisfaction trend ────────────────────────────────
  const satisfactionTrend: { date: string; avg: number }[] = [];
  const satMap = new Map<string, { sum: number; count: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    satMap.set(dayKey(d), { sum: 0, count: 0 });
  }
  for (const c of sat14) {
    const k = dayKey(c.createdAt);
    const entry = satMap.get(k);
    if (entry && c.satisfaction != null) {
      entry.sum += c.satisfaction;
      entry.count += 1;
    }
  }
  for (let i = 13; i >= 0; i--) {
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

  // ─── Hourly activity (0-23) from 90-day conversations ────────
  const hourlyActivity: { hour: number; count: number }[] = [];
  const hourCounts = new Array(24).fill(0);
  for (const c of conv90) {
    hourCounts[c.createdAt.getHours()] += 1;
  }
  let peakHour = -1;
  let peakCount = 0;
  for (let h = 0; h < 24; h++) {
    hourlyActivity.push({ hour: h, count: hourCounts[h] });
    if (hourCounts[h] > peakCount) {
      peakCount = hourCounts[h];
      peakHour = h;
    }
  }

  // ─── Channel breakdown (Widget vs API vs Other) ───────────────
  let channelWidget = 0;
  let channelApi = 0;
  let channelOther = 0;
  for (const g of channelGroups) {
    const ch = (g.channel ?? "").toUpperCase();
    const c = g._count._all;
    if (ch === "WIDGET") channelWidget += c;
    else if (ch === "API") channelApi += c;
    else channelOther += c;
  }

  // ─── Response time distribution by message count ──────────────
  // Buckets: 1-2 msgs, 3-5 msgs, 6-10 msgs, 10+ msgs
  const buckets = { "1-2 msgs": 0, "3-5 msgs": 0, "6-10 msgs": 0, "10+ msgs": 0 };
  for (const c of convsWithCounts) {
    const n = c._count.messages;
    if (n <= 0) continue;
    if (n <= 2) buckets["1-2 msgs"] += 1;
    else if (n <= 5) buckets["3-5 msgs"] += 1;
    else if (n <= 10) buckets["6-10 msgs"] += 1;
    else buckets["10+ msgs"] += 1;
  }
  const responseTimeDist = [
    { range: "1-2 msgs", count: buckets["1-2 msgs"] },
    { range: "3-5 msgs", count: buckets["3-5 msgs"] },
    { range: "6-10 msgs", count: buckets["6-10 msgs"] },
    { range: "10+ msgs", count: buckets["10+ msgs"] },
  ];

  // ─── Avg response time (first VISITOR msg → first AI reply) ────
  function computeAvgResponseTime(
    msgs: { conversationId: string; role: string; createdAt: Date }[]
  ): number {
    const byConv = new Map<
      string,
      { firstVisitor?: Date; firstAiAfter?: Date }
    >();
    for (const m of msgs) {
      const entry = byConv.get(m.conversationId) ?? {};
      if (m.role === "VISITOR" && !entry.firstVisitor) {
        entry.firstVisitor = m.createdAt;
      } else if (m.role === "AI" && entry.firstVisitor) {
        if (!entry.firstAiAfter || m.createdAt < entry.firstAiAfter) {
          entry.firstAiAfter = m.createdAt;
        }
      }
      byConv.set(m.conversationId, entry);
    }
    let totalMs = 0;
    let n = 0;
    for (const e of byConv.values()) {
      if (e.firstVisitor && e.firstAiAfter) {
        const diff = e.firstAiAfter.getTime() - e.firstVisitor.getTime();
        if (diff >= 0 && diff < 60 * 60 * 1000) {
          // ignore responses > 1h (likely async)
          totalMs += diff;
          n += 1;
        }
      }
    }
    return n > 0 ? Math.round((totalMs / n) / 1000) : 0;
  }

  const avgResponseTime = computeAvgResponseTime(recentMessages);
  const prevAvgResponseTime = computeAvgResponseTime(prevMessages);

  // ─── Top questions — first VISITOR message per conversation ───
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
    .slice(0, 8);

  // ─── KPI rollups ───────────────────────────────────────────────
  const humanTotal = humanHandled + closedHandled;
  const resolutionRate =
    totalConversations > 0
      ? Math.round((aiHandled / totalConversations) * 100)
      : 0;
  const avgSatisfaction =
    satisfactionAgg._avg.satisfaction != null
      ? Math.round(satisfactionAgg._avg.satisfaction * 10) / 10
      : 0;

  // Previous 7-day window metrics
  const prevResolutionRate =
    prevConvCount > 0 ? Math.round((prevAiHandled / prevConvCount) * 100) : 0;
  const prevAvgSatisfaction =
    prevSatAgg._avg.satisfaction != null
      ? Math.round(prevSatAgg._avg.satisfaction * 10) / 10
      : 0;

  return NextResponse.json({
    totalConversations,
    aiHandled,
    humanHandled: humanTotal,
    resolutionRate,
    avgSatisfaction,
    totalContacts,
    totalMessages,
    avgResponseTime,
    peakHour,
    conversationsTrend,
    satisfactionTrend,
    hourlyActivity,
    responseTimeDist,
    channelBreakdown: {
      widget: channelWidget,
      api: channelApi,
      other: channelOther,
    },
    statusBreakdown: {
      ai: aiHandled,
      human: humanHandled,
      closed: closedHandled,
    },
    topQuestions,
    prev: {
      resolutionRate: prevResolutionRate,
      avgSatisfaction: prevAvgSatisfaction,
      totalMessages: prevMsgCount,
      avgResponseTime: prevAvgResponseTime,
      totalConversations: prevConvCount,
    },
  } satisfies AnalyticsResponse);
}
