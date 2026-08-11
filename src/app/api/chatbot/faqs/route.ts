import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getOrgChatbot } from "@/lib/session";

const createSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(4000),
});

/** POST /api/chatbot/faqs — create a FAQ tied to the org's chatbot. */
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
    const faq = await db.faq.create({
      data: {
        chatbotId: chatbot.id,
        question: parsed.data.question.trim(),
        answer: parsed.data.answer.trim(),
      },
    });
    return NextResponse.json({ faq }, { status: 201 });
  } catch (e) {
    console.error("[faqs POST] error", e);
    return NextResponse.json(
      { error: "Failed to create FAQ." },
      { status: 500 }
    );
  }
}
