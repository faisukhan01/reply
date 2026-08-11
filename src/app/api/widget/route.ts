import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateReply } from "@/lib/ai";

/**
 * Public widget API — NO AUTH.
 * Used by the embedded chat widget (src/app/widget/[botId]) and the
 * `<script>` embed customers drop into their own websites.
 */

// GET /api/widget?botId=...
// Returns the public-facing bot config. If the bot is PAUSED, returns
// `{ status: "PAUSED" }` so the widget can render an "offline" state.
export async function GET(req: NextRequest) {
  const botId = req.nextUrl.searchParams.get("botId");
  if (!botId) {
    return NextResponse.json(
      { error: "botId is required" },
      { status: 400 }
    );
  }

  try {
    const bot = await db.chatbot.findUnique({
      where: { id: botId },
      select: {
        id: true,
        name: true,
        welcomeMessage: true,
        primaryColor: true,
        status: true,
        position: true,
      },
    });

    if (!bot) {
      return NextResponse.json(
        { error: "Chatbot not found" },
        { status: 404 }
      );
    }

    if (bot.status === "PAUSED") {
      return NextResponse.json({ status: "PAUSED" });
    }

    return NextResponse.json(bot);
  } catch (e) {
    console.error("[widget] GET error:", e);
    return NextResponse.json(
      { error: "Failed to load bot config" },
      { status: 500 }
    );
  }
}

// POST /api/widget
// Body: { botId, visitorId, message, visitorName?, visitorEmail? }
// Returns: { reply, conversationId }
// Always returns 200 with a `reply` string — even on errors — so the
// widget never crashes for the end user.
export async function POST(req: NextRequest) {
  const FALLBACK_REPLY =
    "I'm having trouble connecting right now. A human agent will follow up shortly — could you share your email so we can reach you?";

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { reply: "Invalid request.", conversationId: null },
        { status: 200 }
      );
    }

    const {
      botId,
      visitorId,
      message,
      visitorName,
      visitorEmail,
    } = body as {
      botId?: string;
      visitorId?: string;
      message?: string;
      visitorName?: string;
      visitorEmail?: string;
    };

    if (!botId || !visitorId || !message || !message.trim()) {
      return NextResponse.json(
        { reply: "Please provide a message.", conversationId: null },
        { status: 200 }
      );
    }

    const chatbot = await db.chatbot.findUnique({
      where: { id: botId },
      include: { knowledge: true, faqs: true },
    });

    if (!chatbot) {
      return NextResponse.json(
        {
          reply:
            "I couldn't find my configuration. Please contact the site owner.",
          conversationId: null,
        },
        { status: 200 }
      );
    }

    if (chatbot.status === "PAUSED") {
      return NextResponse.json(
        {
          reply:
            "Our assistant is currently offline. Please try again later or email support.",
          conversationId: null,
        },
        { status: 200 }
      );
    }

    // Find the most recent conversation for this (chatbot, visitor) pair,
    // or create a new one. Status defaults to "AI" (handled by AI until a
    // human agent takes over in the inbox).
    let conversation = await db.conversation.findFirst({
      where: { chatbotId: botId, visitorId },
      orderBy: { updatedAt: "desc" },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          chatbotId: botId,
          visitorId,
          visitorName: visitorName || null,
          visitorEmail: visitorEmail || null,
          status: "AI",
          channel: "WIDGET",
        },
      });
    } else if (
      (visitorName && !conversation.visitorName) ||
      (visitorEmail && !conversation.visitorEmail)
    ) {
      // Backfill visitor info if we didn't have it before.
      conversation = await db.conversation.update({
        where: { id: conversation.id },
        data: {
          visitorName: visitorName || conversation.visitorName,
          visitorEmail: visitorEmail || conversation.visitorEmail,
        },
      });
    }

    // Persist the visitor's message.
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "VISITOR",
        content: message,
      },
    });

    // Load the last 10 messages for context.
    const history = await db.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // Generate the AI reply. generateReply already swallows SDK errors
    // and returns a fallback string, but we wrap defensively anyway.
    let reply: string;
    try {
      reply = await generateReply(chatbot, history, message);
    } catch (e) {
      console.error("[widget] generateReply failed:", e);
      reply = FALLBACK_REPLY;
    }

    // Persist the AI reply.
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "AI",
        content: reply,
      },
    });

    // Bump conversation.updatedAt so the inbox shows it as recent.
    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      reply,
      conversationId: conversation.id,
    });
  } catch (e) {
    console.error("[widget] POST error:", e);
    return NextResponse.json(
      { reply: FALLBACK_REPLY, conversationId: null },
      { status: 200 }
    );
  }
}
