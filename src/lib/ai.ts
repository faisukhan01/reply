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

/**
 * Generate a short AI summary of a conversation (for agents in the inbox).
 * Returns a concise paragraph covering: what the visitor wanted, the outcome, and any action items.
 */
export async function generateConversationSummary(
  chatbot: Pick<Chatbot, "name">,
  messages: Message[]
): Promise<string> {
  if (messages.length === 0) return "No messages in this conversation yet.";

  const transcript = messages
    .map((m) => `${m.role === "VISITOR" ? "Visitor" : m.role === "AI" ? "AI" : "Agent"}: ${m.content}`)
    .join("\n");

  const systemPrompt =
    "You are an assistant that writes concise summaries of customer support conversations for human agents. " +
    "Summarize in 2-3 sentences: (1) what the visitor wanted, (2) what was resolved or is still pending, " +
    "and (3) any action items for the agent. Be factual and brief. Do not add opinions.";

  const userPrompt = `Chatbot: ${chatbot.name}\n\nConversation transcript:\n${transcript}\n\nWrite the summary now.`;

  try {
    const zai = await getZAI();
    const res = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    });
    return (
      res?.choices?.[0]?.message?.content?.trim() ||
      "Unable to generate a summary for this conversation."
    );
  } catch (e) {
    console.error("[ai] generateConversationSummary failed:", e);
    return "Summary temporarily unavailable. Please read the conversation transcript directly.";
  }
}

/**
 * Generate 3 suggested reply options for a human agent, based on the conversation so far
 * and the chatbot's knowledge base. Each suggestion is a short, ready-to-send reply.
 */
export async function generateReplySuggestions(
  chatbot: Chatbot & { knowledge: KnowledgeDoc[]; faqs: FAQ[] },
  messages: Message[]
): Promise<string[]> {
  if (messages.length === 0) {
    return [
      "Hi! Thanks for reaching out. How can I help you today?",
      "Hello! I'd be happy to assist. Could you share a bit more about what you need?",
      "Hey there! What can I do for you?",
    ];
  }

  const transcript = messages
    .slice(-12)
    .map((m) => `${m.role === "VISITOR" ? "Visitor" : m.role === "AI" ? "AI Assistant" : "Agent"}: ${m.content}`)
    .join("\n");

  const kbContext =
    chatbot.faqs.length > 0 || chatbot.knowledge.length > 0
      ? "\n\nReference info:\n" +
        chatbot.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n") +
        "\n" +
        chatbot.knowledge.map((k) => `[${k.title}] ${k.content}`).join("\n")
      : "";

  const systemPrompt =
    "You are an assistant that helps human support agents write replies. " +
    "Given the conversation so far and the reference info, write 3 DIFFERENT reply options the agent could send next. " +
    "Each reply should be 1-3 sentences, friendly, professional, and directly address the visitor's last message. " +
    "Use the reference info when relevant. Do not invent facts not in the reference info. " +
    'Return EXACTLY in this format (one reply per line, no numbering, no quotes):\nREPLY1\nREPLY2\nREPLY3';

  const userPrompt = `Conversation so far:\n${transcript}${kbContext}\n\nWrite 3 reply options now.`;

  try {
    const zai = await getZAI();
    const res = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    });
    const raw = res?.choices?.[0]?.message?.content?.trim() || "";
    const replies = raw
      .split("\n")
      .map((l: string) =>
        l
          .replace(/^[-*\d.)\]\s]+/, "")
          .replace(/^(REPLY\s*\d*|Option\s*\d*|Suggestion\s*\d*)\s*[:\-]?\s*/i, "")
          .trim()
      )
      .filter((l: string) => l.length > 10 && !/^REPLY\d*$/i.test(l))
      .slice(0, 3);
    if (replies.length === 0) {
      return [
        "Thanks for your message! Let me look into this for you right away.",
        "I understand — could you share a bit more detail so I can help precisely?",
        "Great question! Here's what I can tell you...",
      ];
    }
    while (replies.length < 3) replies.push(replies[replies.length - 1]);
    return replies;
  } catch (e) {
    console.error("[ai] generateReplySuggestions failed:", e);
    return [
      "Thanks for reaching out! I'm looking into this now and will get back to you shortly.",
      "I'd be happy to help with that. Could you share your account email so I can check?",
      "Got it — let me find the right answer for you.",
    ];
  }
}
