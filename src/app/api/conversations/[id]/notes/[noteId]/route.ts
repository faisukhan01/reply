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
 * DELETE /api/conversations/[id]/notes/[noteId]
 * Deletes an internal note. Only the note's author or an OWNER/ADMIN can delete.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, noteId } = await params;

  // Verify the conversation belongs to the user's org.
  const conv = await getOwnedConversation(id, user.orgId);
  if (!conv) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { id: true, authorId: true, conversationId: true },
  });

  if (!note || note.conversationId !== id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const isAuthor = note.authorId === user.id;
  const isManager = user.role === "OWNER" || user.role === "ADMIN";
  if (!isAuthor && !isManager) {
    return NextResponse.json(
      { error: "Forbidden — only the author or an admin can delete this note" },
      { status: 403 }
    );
  }

  await db.note.delete({ where: { id: noteId } });

  return NextResponse.json({ success: true });
}
