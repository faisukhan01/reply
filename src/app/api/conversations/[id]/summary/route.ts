import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { generateConversationSummary } from "@/lib/ai";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      chatbot: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation || conversation.chatbot.orgId !== user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const summary = await generateConversationSummary(
    { name: conversation.chatbot.name },
    conversation.messages
  );

  // Persist the summary on the conversation so it doesn't need regenerating every time
  await db.conversation.update({
    where: { id },
    data: { summary },
  });

  return NextResponse.json({ summary });
}
