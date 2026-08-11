import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Get the user's primary chatbot (auto-creates one on first org login). */
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
