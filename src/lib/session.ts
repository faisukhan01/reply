/**
 * Server-side session helpers — drop-in replacement for the old
 * NextAuth-based getCurrentUser()/requireUser().
 *
 * All API routes that previously called getCurrentUser() / requireUser()
 * still work — they now read the JWT cookie directly via jose, no NextAuth.
 */

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentSessionUser, type SessionUser } from "@/lib/auth";

export type { SessionUser };

/** Get the current logged-in user, or null if unauthenticated. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return await getCurrentSessionUser();
}

/** Require a logged-in user — redirects to /login if not. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Get the user's primary chatbot (auto-creates one on first org login).
 * Kept here so existing API routes that import { getOrgChatbot } keep working.
 */
export async function getOrgChatbot(orgId: string) {
  let bot = await db.chatbot.findFirst({
    where: { orgId },
    include: { knowledge: true, faqs: true },
  });
  if (!bot) {
    bot = await db.chatbot.create({
      data: {
        orgId,
        name: "Support Bot",
        welcomeMessage: "Hi there! 👋 I'm your AI assistant. How can I help you today?",
        persona: "friendly",
        systemPrompt:
          "You are a helpful customer support assistant. Answer questions based on the provided knowledge base. If you don't know the answer, say so honestly and offer to connect the visitor with a human agent. Keep responses concise and friendly.",
        primaryColor: "#6366f1",
        status: "ACTIVE",
      },
      include: { knowledge: true, faqs: true },
    });
  }
  return bot;
}
