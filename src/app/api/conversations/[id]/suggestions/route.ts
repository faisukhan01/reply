import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { generateReplySuggestions } from "@/lib/ai";

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
      chatbot: { include: { knowledge: true, faqs: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation || conversation.chatbot.orgId !== user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const suggestions = await generateReplySuggestions(
    conversation.chatbot,
    conversation.messages
  );

  return NextResponse.json({ suggestions });
}
