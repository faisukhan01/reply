import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** DELETE /api/chatbot/faqs/[id] — delete a FAQ (org-scoped). */
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
    const faq = await db.faq.findUnique({
      where: { id },
      include: { chatbot: { select: { orgId: true } } },
    });

    if (!faq) {
      return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
    }

    if (faq.chatbot.orgId !== user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.faq.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[faqs DELETE] error", e);
    return NextResponse.json(
      { error: "Failed to delete FAQ." },
      { status: 500 }
    );
  }
}
