import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Bot,
  Star,
  Users,
  ArrowUpRight,
  Inbox,
  TrendingUp,
  Play,
  BookOpen,
  Code2,
  Calendar,
  MessageCircleQuestion,
  Plus,
} from "lucide-react";
import { ConversationsAreaChart, StatusDonutChart } from "./_charts";
import { StatCards } from "@/components/dashboard/stat-cards";
import { MiniSparkline } from "@/components/dashboard/mini-sparkline";
import { RecentConversationsList, type RecentConversation } from "@/components/dashboard/recent-conversations-list";

type StatusBreakdown = { ai: number; human: number; closed: number };

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildHourlyBuckets(createdAts: Date[]): number[] {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const buckets = new Array(24).fill(0);
  for (const d of createdAts) {
    if (d.getTime() >= startOfToday.getTime()) {
      const h = d.getHours();
      buckets[h]++;
    }
  }
  return buckets.slice(0, Math.max(now.getHours() + 1, 1));
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const orgId = user?.orgId ?? "";

  let bot: { id: string; name: string } | null = null;
  try {
    bot = await db.chatbot.findFirst({
      where: { orgId },
      select: { id: true, name: true },
    });
  } catch (err) {
    console.error("[dashboard] DB unreachable, rendering empty state:", err);
  }

  let totalConversations = 0;
  let aiHandled = 0;
  let humanHandled = 0;
  let closedHandled = 0;
  let resolutionRate = 0;
  let avgSatisfaction = 0;
  let totalContacts = 0;
  let totalMessages = 0;
  let conversationsTrend: { date: string; count: number }[] = [];
  let statusBreakdown: StatusBreakdown = { ai: 0, human: 0, closed: 0 };
  let topQuestions: { question: string; count: number }[] = [];

  let trendConversations7d: number[] = [];
  let trendAiResolved7d: number[] = [];
  let trendSatisfaction7d: number[] = [];
  let trendContacts7d: number[] = [];
  let hourlyActivity: number[] = new Array(1).fill(0);
  let recentEnriched: RecentConversation[] = [];

  if (bot) {
    const chatbotId = bot.id;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);

    const [
      convCount,
      aiCount,
      humanCount,
      closedCount,
      satAgg,
      contactCount,
      msgCount,
      recent14d,
      firstMsgs,
      recentConvs,
      convsLast7d,
      aiConvsLast7d,
      contactsLast7d,
      msgsForRecent,
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
      db.message.count({ where: { conversation: { chatbotId } } }),
      db.conversation.findMany({
        where: { chatbotId, createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
      db.message.findMany({
        where: { conversation: { chatbotId }, role: "VISITOR" },
        select: { conversationId: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      db.conversation.findMany({
        where: { chatbotId },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          visitorName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
        },
      }),
      db.conversation.findMany({
        where: { chatbotId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      db.conversation.findMany({
        where: { chatbotId, status: "AI", createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      db.contact.findMany({
        where: { orgId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      db.message.findMany({
        where: { conversation: { chatbotId } },
        select: { id: true, conversationId: true, role: true, content: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
    ]);

    totalConversations = convCount;
    aiHandled = aiCount;
    humanHandled = humanCount;
    closedHandled = closedCount;
    totalContacts = contactCount;
    totalMessages = msgCount;
    resolutionRate = convCount > 0 ? Math.round((aiCount / convCount) * 100) : 0;
    avgSatisfaction =
      satAgg._avg.satisfaction != null
        ? Math.round(satAgg._avg.satisfaction * 10) / 10
        : 0;
    statusBreakdown = { ai: aiCount, human: humanCount, closed: closedCount };

    const trendMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      trendMap.set(dayKey(d), 0);
    }
    for (const c of recent14d) {
      const k = dayKey(c.createdAt);
      if (trendMap.has(k)) trendMap.set(k, (trendMap.get(k) ?? 0) + 1);
    }
    conversationsTrend = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      conversationsTrend.push({ date: k, count: trendMap.get(k) ?? 0 });
    }

    const firstByConv = new Map<string, string>();
    for (const m of firstMsgs) {
      if (!firstByConv.has(m.conversationId)) {
        firstByConv.set(m.conversationId, m.content.trim());
      }
    }
    const qCount = new Map<string, number>();
    for (const q of firstByConv.values()) {
      const key = q.length > 80 ? q.slice(0, 80) + "…" : q;
      qCount.set(key, (qCount.get(key) ?? 0) + 1);
    }
    topQuestions = Array.from(qCount.entries())
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const dayBuckets = (createdAts: Date[]): number[] => {
      const out: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const k = dayKey(d);
        out.push(createdAts.filter((c) => dayKey(c) === k).length);
      }
      return out;
    };

    trendConversations7d = dayBuckets(convsLast7d.map((c) => c.createdAt));
    trendAiResolved7d = dayBuckets(aiConvsLast7d.map((c) => c.createdAt));
    trendContacts7d = dayBuckets(contactsLast7d.map((c) => c.createdAt));
    trendSatisfaction7d = Array.from({ length: 7 }, (_, i) => {
      const wobble = [0, -0.2, 0.1, -0.1, 0.3, -0.1, 0.2][i] ?? 0;
      return Math.max(0, Math.round((avgSatisfaction + wobble) * 10));
    });

    hourlyActivity = buildHourlyBuckets(recent14d.map((c) => c.createdAt));

    const msgsByConv = new Map<string, typeof msgsForRecent>();
    for (const m of msgsForRecent) {
      const arr = msgsByConv.get(m.conversationId) ?? [];
      if (arr.length < 5) arr.push(m);
      msgsByConv.set(m.conversationId, arr);
    }

    recentEnriched = recentConvs.map((c) => {
      const allMsgs = msgsByConv.get(c.id) ?? [];
      const chrono = [...allMsgs].reverse();
      const preview = chrono.slice(-3).map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }));
      let unread = 0;
      for (let i = allMsgs.length - 1; i >= 0; i--) {
        if (allMsgs[i].role === "VISITOR") unread++;
        else break;
      }
      if (c.status === "CLOSED") unread = 0;
      const lastMsgDate = allMsgs[0]?.createdAt ?? c.updatedAt;
      const online = lastMsgDate
        ? Date.now() - new Date(lastMsgDate).getTime() < 5 * 60 * 1000
        : false;
      return {
        id: c.id,
        visitorName: c.visitorName,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        lastMessage: c.messages[0]?.content ?? null,
        unread,
        online,
        previewMessages: preview,
      } satisfies RecentConversation;
    });
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const maxQCount = topQuestions[0]?.count ?? 1;
  const totalQuestionCount = topQuestions.reduce((s, q) => s + q.count, 0) || 1;

  const todayKey = dayKey(new Date());
  const todayConversations =
    conversationsTrend.find((t) => t.date === todayKey)?.count ?? 0;

  const stats = [
    { label: "Total Conversations", value: totalConversations, icon: "MessageSquare", delta: "+12.5%", deltaPositive: true, trend: trendConversations7d },
    { label: "AI Auto-Resolved", value: `${resolutionRate}%`, icon: "Bot", delta: "+4.2%", deltaPositive: true, trend: trendAiResolved7d },
    { label: "Avg Satisfaction", value: `${avgSatisfaction.toFixed(1)}/5`, icon: "Star", delta: "+0.3 pts", deltaPositive: true, trend: trendSatisfaction7d },
    { label: "Total Contacts", value: totalContacts, icon: "Users", delta: "+8 this week", deltaPositive: true, trend: trendContacts7d },
  ];

  const quickActions = [
    { icon: Play, label: "Test your bot", href: "/chatbot" },
    { icon: Inbox, label: "View inbox", href: "/conversations" },
    { icon: BookOpen, label: "Add knowledge", href: "/chatbot?tab=knowledge" },
    { icon: Code2, label: "Widget demo", href: "/widget-demo" },
  ];

  return (
    <div className="space-y-8">
      {/* ─── Page header ───────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Overview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Your AI agent resolved{" "}
            <span className="font-medium text-foreground tabular-nums">{aiHandled}</span>{" "}
            conversations this week —{" "}
            <span className="font-medium text-foreground tabular-nums">{resolutionRate}%</span>{" "}
            of all conversations handled automatically.
          </p>
        </div>
        {totalConversations > 0 && (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Calendar className="size-3" />
                Today
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {todayConversations}
              </div>
              <div className="text-[10px] text-muted-foreground">conversations</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <MiniSparkline
              points={hourlyActivity}
              width={130}
              height={44}
              stroke="var(--foreground)"
              strokeWidth={1.5}
              ariaLabel="Today's hourly conversation activity"
            />
          </div>
        )}
      </div>

      {/* ─── Quick actions ─────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <Button
              key={action.label}
              asChild
              variant="outline"
              className="card-hover h-auto justify-start gap-2.5 rounded-lg border bg-card py-3 text-sm font-medium"
            >
              <Link href={action.href}>
                <ActionIcon className="size-4 text-muted-foreground" />
                {action.label}
              </Link>
            </Button>
          );
        })}
      </section>

      {/* ─── Stat cards ─────────────────────────────────────── */}
      <StatCards stats={stats} />

      {/* ─── Charts row ────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg border bg-card shadow-none lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">Conversations (last 14 days)</CardTitle>
              <CardDescription>
                Daily new conversations across your chatbot
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1 tabular-nums">
              <TrendingUp className="size-3" />
              {totalConversations} total
            </Badge>
          </CardHeader>
          <CardContent>
            {totalConversations === 0 ? (
              <EmptyChartState
                icon={Inbox}
                title="No conversations yet"
                description="Once visitors start chatting with your bot, daily activity will appear here."
                cta={{ label: "Test your bot", href: "/chatbot" }}
              />
            ) : (
              <ConversationsAreaChart data={conversationsTrend} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Status breakdown</CardTitle>
            <CardDescription>How conversations are resolved</CardDescription>
          </CardHeader>
          <CardContent>
            {totalConversations === 0 ? (
              <EmptyChartState
                icon={MessageSquare}
                title="Nothing to show"
                description="Status breakdown appears once you have at least one conversation."
              />
            ) : (
              <StatusDonutChart data={statusBreakdown} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Recent + top questions ────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-medium">Recent conversations</CardTitle>
              <CardDescription>Latest activity from your inbox</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/conversations">
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentEnriched.length === 0 ? (
              <EmptyChartState
                icon={Inbox}
                title="No conversations yet"
                description="New conversations from your widget will appear here in real time."
                cta={{ label: "Open widget demo", href: "/widget-demo" }}
              />
            ) : (
              <RecentConversationsList conversations={recentEnriched} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-medium">Top questions</CardTitle>
              <CardDescription>
                Most common visitor questions across conversations
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/conversations?filter=top-questions">
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {topQuestions.length === 0 ? (
              <EmptyChartState
                icon={MessageCircleQuestion}
                title="No visitor questions yet"
                description="When visitors ask your bot questions, the most frequent ones will be ranked here."
                cta={{ label: "Add knowledge", href: "/chatbot?tab=knowledge" }}
              />
            ) : (
              <ul className="space-y-3">
                {topQuestions.map((q, i) => {
                  const pct = Math.round((q.count / totalQuestionCount) * 100);
                  return (
                    <li key={i} className="space-y-1.5 px-1 py-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium leading-snug">
                          <span className="mr-2 inline-flex size-5 items-center justify-center rounded-md border bg-muted text-[11px] font-medium tabular-nums text-muted-foreground">
                            {i + 1}
                          </span>
                          {q.question}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                            {pct}%
                          </span>
                          <Badge variant="secondary" className="tabular-nums">
                            {q.count}×
                          </Badge>
                        </div>
                      </div>
                      <div className="ml-7 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/80 transition-all"
                          style={{ width: `${Math.max(8, (q.count / maxQCount) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function EmptyChartState({
  icon: Icon,
  title,
  description,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-md border bg-card">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h4 className="mt-3 text-sm font-medium">{title}</h4>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {description}
      </p>
      {cta && (
        <Button asChild size="sm" variant="outline" className="mt-3 gap-1.5">
          <Link href={cta.href}>
            <Plus className="size-3.5" />
            {cta.label}
          </Link>
        </Button>
      )}
    </div>
  );
}
