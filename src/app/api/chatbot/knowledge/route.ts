import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getOrgChatbot } from "@/lib/session";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(20000),
});

/** POST /api/chatbot/knowledge — create a knowledge doc tied to the org's chatbot. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const chatbot = await getOrgChatbot(user.orgId);
    const doc = await db.knowledgeDoc.create({
      data: {
        chatbotId: chatbot.id,
        title: parsed.data.title.trim(),
        content: parsed.data.content,
        sourceType: "TEXT",
      },
    });
    return NextResponse.json({ doc }, { status: 201 });
  } catch (e) {
    console.error("[knowledge POST] error", e);
    return NextResponse.json(
      { error: "Failed to create knowledge document." },
      { status: 500 }
    );
  }
}
