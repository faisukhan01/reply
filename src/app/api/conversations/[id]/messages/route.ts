import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

async function getOwnedConversation(id: string, orgId: string) {
  const conv = await db.conversation.findUnique({
    where: { id },
    include: { chatbot: { select: { orgId: true, id: true, name: true } } },
  });
  if (!conv || conv.chatbot.orgId !== orgId) return null;
  return conv;
}

/**
 * POST /api/conversations/[id]/messages
 * Body: { content }
 *
 * Agent sends a message:
 *   - Creates a Message with role "AGENT"
 *   - Updates conversation.updatedAt
 *   - Returns the created message
 *
 * Realtime delivery: the calling inbox client emits `agent:message` over its
 * own socket.io-client connection after this POST returns (see
 * src/lib/realtime-client.ts). This keeps the realtime service a pure relay
 * and avoids server-to-server socket connections through the gateway.
 *
 * After agent replies, the conversation status is left as-is — even if it was
 * "AI", the agent is now assisting (per spec).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conv = await getOwnedConversation(id, user.orgId);
  if (!conv) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json(
      { error: "content too long (max 4000 chars)" },
      { status: 400 }
    );
  }

  if (conv.status === "CLOSED") {
    return NextResponse.json(
      { error: "Conversation is closed" },
      { status: 400 }
    );
  }

  const message = await db.message.create({
    data: {
      conversationId: id,
      role: "AGENT",
      content,
    },
  });

  // Bump conversation updatedAt (status stays — agent is assisting).
  await db.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ message });
}
