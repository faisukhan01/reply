import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

function csvEscape(s: string | null | undefined): string {
  if (s == null) return "";
  const str = String(s);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bot = await db.chatbot.findFirst({ where: { orgId: user.orgId } });
  if (!bot) {
    return NextResponse.json(
      { error: "No chatbot found" },
      { status: 404 }
    );
  }

  const conversations = await db.conversation.findMany({
    where: { chatbotId: bot.id },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      assignedTo: { select: { name: true } },
    },
    take: 1000,
  });

  const headers = [
    "ID",
    "Visitor Name",
    "Visitor Email",
    "Status",
    "Channel",
    "Satisfaction",
    "Assigned To",
    "Message Count",
    "Created At",
    "Updated At",
    "First Visitor Message",
    "Last Message",
  ];

  const rows = conversations.map((c) => {
    const firstVisitor = c.messages.find((m) => m.role === "VISITOR");
    const lastMsg = c.messages[c.messages.length - 1];
    return [
      c.id,
      c.visitorName || "",
      c.visitorEmail || "",
      c.status,
      c.channel,
      c.satisfaction?.toString() || "",
      c.assignedTo?.name || "",
      c.messages.length.toString(),
      c.createdAt.toISOString(),
      c.updatedAt.toISOString(),
      firstVisitor?.content || "",
      lastMsg?.content || "",
    ].map(csvEscape).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="replyai-conversations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
