import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET /api/contacts?q=search
// Returns contacts with conversationCount + lastSeenAt derived from
// conversations matching the contact's email (visitorEmail).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const where = {
    orgId: user.orgId,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const contacts = await db.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  // Fetch matching conversations for all contact emails in one go
  const emails = contacts
    .map((c) => c.email)
    .filter((e): e is string => Boolean(e));

  let convAggByContact: Record<
    string,
    { count: number; lastSeenAt: string | null }
  > = {};

  if (emails.length > 0 && user.orgId) {
    const chatbots = await db.chatbot.findMany({
      where: { orgId: user.orgId },
      select: { id: true },
    });
    const chatbotIds = chatbots.map((c) => c.id);

    if (chatbotIds.length > 0) {
      const convs = await db.conversation.findMany({
        where: {
          chatbotId: { in: chatbotIds },
          visitorEmail: { in: emails },
        },
        select: { visitorEmail: true, updatedAt: true },
      });

      const byEmail = new Map<
        string,
        { count: number; lastSeenAt: Date | null }
      >();
      for (const c of convs) {
        if (!c.visitorEmail) continue;
        const prev = byEmail.get(c.visitorEmail) ?? {
          count: 0,
          lastSeenAt: null as Date | null,
        };
        prev.count += 1;
        if (!prev.lastSeenAt || c.updatedAt > prev.lastSeenAt) {
          prev.lastSeenAt = c.updatedAt;
        }
        byEmail.set(c.visitorEmail, prev);
      }

      for (const c of contacts) {
        if (!c.email) continue;
        const a = byEmail.get(c.email);
        if (a) {
          convAggByContact[c.id] = {
            count: a.count,
            lastSeenAt: a.lastSeenAt ? a.lastSeenAt.toISOString() : null,
          };
        }
      }
    }
  }

  const enriched = contacts.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    conversationCount: convAggByContact[c.id]?.count ?? 0,
    lastSeenAt: convAggByContact[c.id]?.lastSeenAt ?? null,
  }));

  return NextResponse.json({ contacts: enriched });
}

// POST /api/contacts  body: { name, email?, phone?, notes? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const email =
      typeof body?.email === "string" && body.email.trim()
        ? body.email.trim()
        : null;
    const phone =
      typeof body?.phone === "string" && body.phone.trim()
        ? body.phone.trim()
        : null;
    const notes =
      typeof body?.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    const contact = await db.contact.create({
      data: {
        orgId: user.orgId,
        name,
        email,
        phone,
        notes,
        source: "MANUAL",
      },
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

    return NextResponse.json(
      {
        contact: {
          ...contact,
          createdAt: contact.createdAt.toISOString(),
          conversationCount: 0,
          lastSeenAt: null,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[contacts POST] error", e);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
