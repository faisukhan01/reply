import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

async function getOwnedConversation(id: string, orgId: string) {
  const conv = await db.conversation.findUnique({
    where: { id },
    include: { chatbot: { select: { orgId: true, id: true } } },
  });
  if (!conv || conv.chatbot.orgId !== orgId) return null;
  return conv;
}

/**
 * GET /api/conversations/[id]/notes
 * Returns all internal notes for a conversation, oldest first, with author info.
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

  const notes = await db.note.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      authorId: n.authorId,
      author: {
        id: n.author.id,
        name: n.author.name,
        email: n.author.email,
      },
    })),
  });
}

/**
 * POST /api/conversations/[id]/notes
 * Body: { content }
 * Creates a private internal note authored by the authenticated user.
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

  const note = await db.note.create({
    data: {
      conversationId: id,
      authorId: user.id,
      content,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Bump conversation updatedAt so the inbox list reflects activity.
  await db.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    note: {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      authorId: note.authorId,
      author: {
        id: note.author.id,
        name: note.author.name,
        email: note.author.email,
      },
    },
  });
}
