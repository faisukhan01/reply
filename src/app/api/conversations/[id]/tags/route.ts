import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function getOwnedConversation(id: string, orgId: string) {
  const conv = await db.conversation.findUnique({
    where: { id },
    include: { chatbot: { select: { orgId: true } } },
  });
  if (!conv || conv.chatbot.orgId !== orgId) return null;
  return conv;
}

/**
 * GET /api/conversations/[id]/tags
 * List tags attached to a conversation.
 */
export async function GET(
  _req: NextRequest,
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

  const links = await db.conversationTag.findMany({
    where: { conversationId: id },
    include: { tag: true },
    orderBy: { assignedAt: "asc" },
  });

  return NextResponse.json({
    tags: links.map((l) => ({
      id: l.tag.id,
      name: l.tag.name,
      color: l.tag.color,
      assignedAt: l.assignedAt,
    })),
  });
}

const addSchema = z.object({ tagId: z.string().min(1) });

/**
 * POST /api/conversations/[id]/tags
 * Body: { tagId }
 * Adds a tag to the conversation (idempotent — handles unique constraint).
 */
export async function POST(
  req: NextRequest,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { tagId } = parsed.data;

  // Verify the tag belongs to the same org
  const tag = await db.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.orgId !== user.orgId) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  try {
    await db.conversationTag.create({
      data: { conversationId: id, tagId },
    });
  } catch (err) {
    // Unique constraint — already attached; treat as success.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json({
        tag: { id: tag.id, name: tag.name, color: tag.color },
        alreadyAttached: true,
      });
    }
    throw err;
  }

  return NextResponse.json(
    {
      tag: { id: tag.id, name: tag.name, color: tag.color },
    },
    { status: 201 }
  );
}

/**
 * DELETE /api/conversations/[id]/tags
 * Body: { tagId }
 * Removes a tag from the conversation.
 */
export async function DELETE(
  req: NextRequest,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { tagId } = parsed.data;

  try {
    await db.conversationTag.delete({
      where: {
        conversationId_tagId: { conversationId: id, tagId },
      },
    });
  } catch (err) {
    // Not attached — treat as success.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ ok: true, wasAttached: false });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, wasAttached: true });
}
