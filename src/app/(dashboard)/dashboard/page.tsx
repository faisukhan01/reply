import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Bot,
  Star,
  Users,
  ArrowUpRight,
  Sparkles,
  Inbox,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ConversationsAreaChart, StatusDonutChart } from "./_charts";

type ConvRow = {
  id: string;
  visitorName: string | null;
  status: string;
  createdAt: Date;
  lastMessage: string | null;
};

type StatusBreakdown = { ai: number; human: number; closed: number };

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const orgId = user?.orgId ?? "";

  const bot = await db.chatbot.findFirst({
    where: { orgId },
    select: { id: true, name: true },
  });

  // Default empty metrics
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
  let recent: ConvRow[] = [];

  if (bot) {
    const chatbotId = bot.id;

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
        where: {
          chatbotId,
          createdAt: { gte: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
        },
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
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true },
          },
        },
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

    // 14-day trend (oldest → today)
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

    // Top questions — first VISITOR message per conversation
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

    recent = recentConvs.map((c) => ({
      id: c.id,
      visitorName: c.visitorName,
      status: c.status,
      createdAt: c.createdAt,
      lastMessage: c.messages[0]?.content ?? null,
    }));
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const maxQCount = topQuestions[0]?.count ?? 1;

  const stats = [
    {
      label: "Total Conversations",
      value: totalConversations,
      icon: MessageSquare,
      tone: "violet" as const,
      delta: "+12.5%",
    },
    {
      label: "AI Auto-Resolved",
      value: `${resolutionRate}%`,
      icon: Bot,
      tone: "emerald" as const,
      delta: "+4.2%",
    },
    {
      label: "Avg Satisfaction",
      value: `${avgSatisfaction.toFixed(1)}/5`,
      icon: Star,
      tone: "amber" as const,
      delta: "+0.3 pts",
    },
    {
      label: "Total Contacts",
      value: totalContacts,
      icon: Users,
      tone: "fuchsia" as const,
      delta: "+8 this week",
    },
  ];

  const toneMap: Record<string, { bg: string; fg: string }> = {
    violet: { bg: "bg-violet-100 dark:bg-violet-500/15", fg: "text-violet-600 dark:text-violet-300" },
    emerald: { bg: "bg-emerald-100 dark:bg-emerald-500/15", fg: "text-emerald-600 dark:text-emerald-300" },
    amber: { bg: "bg-amber-100 dark:bg-amber-500/15", fg: "text-amber-600 dark:text-amber-300" },
    fuchsia: { bg: "bg-fuchsia-100 dark:bg-fuchsia-500/15", fg: "text-fuchsia-600 dark:text-fuchsia-300" },
  };

  function statusBadge(status: string) {
    if (status === "AI")
      return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-transparent">AI</Badge>;
    if (status === "HUMAN")
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-transparent">Human</Badge>;
    return <Badge variant="secondary">Closed</Badge>;
  }

  function visitorInitial(name: string | null) {
    const n = (name ?? "Visitor").trim();
    return n.charAt(0).toUpperCase() || "V";
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-200/40 dark:border-violet-500/20 bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 p-6 md:p-8 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 right-24 size-56 rounded-full bg-fuchsia-300/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="size-3.5" />
              {bot?.name ?? "Support Bot"} is online
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Welcome back, {firstName} 👋
            </h1>
            <p className="max-w-xl text-sm text-white/85 md:text-base">
              Your AI agent resolved{" "}
              <span className="font-semibold text-white">{aiHandled} conversations</span>{" "}
              this week — that&apos;s{" "}
              <span className="font-semibold text-white">{resolutionRate}%</span> of all
              conversations handled automatically.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Button asChild variant="secondary" className="bg-white text-violet-700 hover:bg-white/90 shadow-sm">
              <Link href="/conversations">
                <Inbox className="size-4" />
                View live inbox
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Row 1 — stat cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const tone = toneMap[s.tone];
          return (
            <Card key={s.label} className="rounded-xl shadow-sm">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${tone.bg}`}>
                    <Icon className={`size-5 ${tone.fg}`} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="size-3.5" />
                    {s.delta}
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight tabular-nums">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Row 2 — area chart + donut */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl shadow-sm lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base">Conversations (last 14 days)</CardTitle>
              <CardDescription>
                Daily new conversations across your chatbot
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="size-3" />
              {totalConversations} total
            </Badge>
          </CardHeader>
          <CardContent>
            <ConversationsAreaChart data={conversationsTrend} />
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status breakdown</CardTitle>
            <CardDescription>How conversations are resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonutChart data={statusBreakdown} />
          </CardContent>
        </Card>
      </section>

      {/* Row 3 — recent conversations + top questions */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Recent conversations</CardTitle>
              <CardDescription>Latest activity from your inbox</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-violet-600 dark:text-violet-300 hover:text-violet-700">
              <Link href="/conversations">
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              <ul className="max-h-96 divide-y divide-border overflow-y-auto scroll-thin">
                {recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/conversations?id=${c.id}`}
                      className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-muted/50"
                    >
                      <Avatar className="size-9 border">
                        <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold dark:bg-violet-500/20 dark:text-violet-300">
                          {visitorInitial(c.visitorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {c.visitorName ?? "Anonymous visitor"}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.lastMessage ?? "No messages yet"}
                        </p>
                      </div>
                      <div className="shrink-0">{statusBadge(c.status)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top questions</CardTitle>
            <CardDescription>
              Most common visitor questions across conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topQuestions.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No visitor questions yet
              </div>
            ) : (
              <ul className="space-y-3">
                {topQuestions.map((q, i) => (
                  <li key={i} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium leading-snug">
                        <span className="mr-2 inline-flex size-5 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                          {i + 1}
                        </span>
                        {q.question}
                      </span>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">
                        {q.count}×
                      </Badge>
                    </div>
                    <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        style={{ width: `${Math.max(8, (q.count / maxQCount) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
