import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET /api/contacts/:id
// Returns full contact detail + their conversations (matched via visitorEmail).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contact = await db.contact.findUnique({ where: { id } });
  if (!contact || contact.orgId !== user.orgId) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Find their conversations by email
  let conversations: Array<{
    id: string;
    visitorName: string | null;
    status: string;
    updatedAt: string;
    lastMessage: string | null;
  }> = [];

  if (contact.email) {
    const chatbots = await db.chatbot.findMany({
      where: { orgId: user.orgId },
      select: { id: true },
    });
    const chatbotIds = chatbots.map((c) => c.id);

    if (chatbotIds.length > 0) {
      const convs = await db.conversation.findMany({
        where: {
          chatbotId: { in: chatbotIds },
          visitorEmail: contact.email,
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: {
          id: true,
          visitorName: true,
          status: true,
          updatedAt: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      });

      conversations = convs.map((c) => ({
        id: c.id,
        visitorName: c.visitorName,
        status: c.status,
        updatedAt: c.updatedAt.toISOString(),
        lastMessage: c.messages[0]?.content ?? null,
      }));
    }
  }

  return NextResponse.json({
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      source: contact.source,
      notes: contact.notes,
      createdAt: contact.createdAt.toISOString(),
    },
    conversations,
  });
}

// PATCH /api/contacts/:id  body: { name?, email?, phone?, notes? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.contact.findUnique({ where: { id } });
  if (!existing || existing.orgId !== user.orgId) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | null> = {};

    if (typeof body?.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body?.email === "string") {
      data.email = body.email.trim() || null;
    }
    if (typeof body?.phone === "string") {
      data.phone = body.phone.trim() || null;
    }
    if (typeof body?.notes === "string") {
      data.notes = body.notes.trim() || null;
    }

    const updated = await db.contact.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        source: true,
        notes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      contact: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[contacts PATCH] error", e);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before deleting
  const existing = await db.contact.findUnique({ where: { id } });
  if (!existing || existing.orgId !== user.orgId) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await db.contact.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
