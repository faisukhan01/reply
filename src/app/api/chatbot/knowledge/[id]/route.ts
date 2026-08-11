import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** DELETE /api/chatbot/knowledge/[id] — delete a knowledge doc (org-scoped). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify ownership: the doc's chatbot must belong to the user's org.
    const doc = await db.knowledgeDoc.findUnique({
      where: { id },
      include: { chatbot: { select: { orgId: true } } },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    if (doc.chatbot.orgId !== user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.knowledgeDoc.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[knowledge DELETE] error", e);
    return NextResponse.json(
      { error: "Failed to delete document." },
      { status: 500 }
    );
  }
}
