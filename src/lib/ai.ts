import ZAI from "z-ai-web-dev-sdk";
import type { Chatbot, KnowledgeDoc, FAQ, Message } from "@prisma/client";

let zaiPromise: Promise<ZAI> | null = null;
async function getZAI() {
  if (!zaiPromise) zaiPromise = ZAI.create();
  return zaiPromise;
}

const PERSONA_PROMPTS: Record<string, string> = {
  friendly:
    "Be warm, friendly, and approachable. Use occasional emojis (not too many). Address the user naturally.",
  professional:
    "Be professional, clear, and concise. Maintain a polite and business-appropriate tone.",
  concise:
    "Be very concise. Answer in as few words as possible while remaining helpful and accurate.",
  playful:
    "Be playful and fun. Use humor and emojis generously, while still being helpful and accurate.",
};

/**
 * Build the system prompt from the chatbot config + knowledge base + FAQs.
 */
function buildSystemPrompt(
  chatbot: Chatbot & { knowledge: KnowledgeDoc[]; faqs: FAQ[] }
): string {
  const parts: string[] = [];

  parts.push(
    chatbot.systemPrompt ||
      "You are a helpful customer support assistant. Answer questions based on the provided knowledge base. If you don't know the answer, say so honestly and offer to connect the visitor with a human agent. Keep responses concise and friendly."
  );

  if (PERSONA_PROMPTS[chatbot.persona]) {
    parts.push(`Tone: ${PERSONA_PROMPTS[chatbot.persona]}`);
  }

  if (chatbot.faqs.length > 0) {
    parts.push("\n--- Frequently Asked Questions ---");
    for (const faq of chatbot.faqs) {
      parts.push(`Q: ${faq.question}\nA: ${faq.answer}`);
    }
  }

  if (chatbot.knowledge.length > 0) {
    parts.push("\n--- Knowledge Base ---");
    for (const doc of chatbot.knowledge) {
      parts.push(`[${doc.title}]\n${doc.content}`);
    }
  }

  parts.push(
    "\n--- Instructions ---\n" +
      "1. Answer based ONLY on the knowledge base and FAQs above.\n" +
      "2. If the question is unrelated to the business or not covered, politely say you don't have that information and offer to connect them with a human agent.\n" +
      "3. Never invent facts, prices, or policies not in the knowledge base.\n" +
      "4. Keep responses under 3 sentences unless the user asks for detail.\n" +
      "5. If the user asks to speak with a human, say you'll connect them right away."
  );

  return parts.join("\n");
}

/**
 * Generate an AI reply for a visitor message, given conversation history.
 * Falls back to a graceful message if the AI service is unavailable.
 */
export async function generateReply(
  chatbot: Chatbot & { knowledge: KnowledgeDoc[]; faqs: FAQ[] },
  history: Message[],
  visitorMessage: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(chatbot);

  // Take last 10 messages for context
  const recent = history.slice(-10);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...recent.map((m) => ({
      role: (m.role === "VISITOR" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: visitorMessage },
  ];

  try {
    const zai = await getZAI();
    const res = await zai.chat.completions.create({
      messages,
      stream: false,
    });
    const reply =
      res?.choices?.[0]?.message?.content?.trim() ||
      "I'm sorry, I didn't quite catch that. Could you rephrase your question?";
    return reply;
  } catch (e) {
    console.error("[ai] generateReply failed:", e);
    return "I'm having trouble connecting to my brain right now. A human agent will be with you shortly. Could you share your email so we can follow up?";
  }
}
