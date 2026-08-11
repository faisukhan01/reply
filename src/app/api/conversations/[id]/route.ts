import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

async function getOwnedConversation(id: string, orgId: string) {
  const conv = await db.conversation.findUnique({
    where: { id },
    include: { chatbot: { select: { orgId: true, name: true, id: true } } },
  });
  if (!conv || conv.chatbot.orgId !== orgId) return null;
  return conv;
}

/**
 * GET /api/conversations/[id]
 * Returns the conversation with all messages (asc) + chatbot info.
 */
export async function GET(
  _req: Request,
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

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    conversation: {
      id: conv.id,
      visitorId: conv.visitorId,
      visitorName: conv.visitorName,
      visitorEmail: conv.visitorEmail,
      status: conv.status,
      satisfaction: conv.satisfaction,
      assignedToId: conv.assignedToId,
      channel: conv.channel,
      summary: conv.summary,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      chatbot: {
        id: conv.chatbot.id,
        name: conv.chatbot.name,
      },
    },
    messages,
  });
}

/**
 * PATCH /api/conversations/[id]
 * Body: { status?, assignedToId?, satisfaction? }
 */
export async function PATCH(
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

  let body: {
    status?: string;
    assignedToId?: string | null;
    satisfaction?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: {
    status?: string;
    assignedToId?: string | null;
    satisfaction?: number | null;
  } = {};

  if (
    body.status &&
    ["AI", "HUMAN", "CLOSED"].includes(body.status.toUpperCase())
  ) {
    data.status = body.status.toUpperCase();
    // When taking over, set assignedToId to the acting agent if not provided.
    if (data.status === "HUMAN" && body.assignedToId === undefined) {
      data.assignedToId = user.id;
    }
  }

  if (body.assignedToId !== undefined) {
    data.assignedToId = body.assignedToId; // null clears assignment
  }

  if (body.satisfaction !== undefined) {
    data.satisfaction = body.satisfaction;
  }

  const updated = await db.conversation.update({
    where: { id },
    data,
  });

  return NextResponse.json({ conversation: updated });
}
