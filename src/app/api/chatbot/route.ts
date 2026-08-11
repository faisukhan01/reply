import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getOrgChatbot } from "@/lib/session";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  welcomeMessage: z.string().min(1).max(500).optional(),
  persona: z.enum(["friendly", "professional", "concise", "playful"]).optional(),
  systemPrompt: z.string().max(4000).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/i, "Must be a hex color, e.g. #8b5cf6")
    .optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
});

/** GET /api/chatbot — return the org's chatbot (knowledge + faqs), auto-create if missing. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chatbot = await getOrgChatbot(user.orgId);
    return NextResponse.json({ chatbot });
  } catch (e) {
    console.error("[chatbot GET] error", e);
    return NextResponse.json(
      { error: "Failed to load chatbot." },
      { status: 500 }
    );
  }
}

/** PATCH /api/chatbot — update editable chatbot fields. */
export async function PATCH(req: NextRequest) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const existing = await db.chatbot.findFirst({ where: { orgId: user.orgId } });
    if (!existing) {
      return NextResponse.json(
        { error: "Chatbot not found for this organization." },
        { status: 404 }
      );
    }

    const updated = await db.chatbot.update({
      where: { id: existing.id },
      data: parsed.data,
      include: { knowledge: true, faqs: true },
    });

    return NextResponse.json({ chatbot: updated });
  } catch (e) {
    console.error("[chatbot PATCH] error", e);
    return NextResponse.json(
      { error: "Failed to update chatbot." },
      { status: 500 }
    );
  }
}
