import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  orgName: z.string().min(2),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, orgName } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    let slug = slugify(orgName);
    let suffix = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${slugify(orgName)}-${suffix++}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const org = await db.organization.create({
      data: {
        name: orgName,
        slug,
        plan: "STARTER",
        users: {
          create: {
            name,
            email,
            passwordHash,
            role: "OWNER",
          },
        },
        chatbots: {
          create: {
            name: "Support Bot",
            welcomeMessage:
              "Hi there! 👋 I'm your AI assistant. How can I help you today?",
            persona: "friendly",
            systemPrompt:
              "You are a helpful customer support assistant. Answer questions based on the provided knowledge base. If you don't know the answer, say so honestly and offer to connect the visitor with a human agent. Keep responses concise and friendly.",
            primaryColor: "#8b5cf6",
            status: "ACTIVE",
            faqs: {
              create: [
                {
                  question: "What are your business hours?",
                  answer:
                    "We're open Monday to Friday, 9 AM to 6 PM. Our AI assistant is available 24/7 to help with common questions.",
                },
                {
                  question: "How do I contact support?",
                  answer:
                    "You can reach us through this chat, by email at support@example.com, or call us at +1 (555) 0123 during business hours.",
                },
                {
                  question: "What is your refund policy?",
                  answer:
                    "We offer a 30-day money-back guarantee on all plans. No questions asked. Just email support and we'll process your refund within 3-5 business days.",
                },
              ],
            },
            knowledge: {
              create: [
                {
                  title: "Company Overview",
                  content:
                    "We are a SaaS company building productivity tools for small businesses. Founded in 2023, we serve over 5,000 customers worldwide. Our mission is to make automation accessible to everyone.",
                  sourceType: "TEXT",
                },
                {
                  title: "Pricing Plans",
                  content:
                    "Starter: $29/mo - up to 1,000 conversations. Pro: $79/mo - up to 10,000 conversations + analytics. Scale: $199/mo - unlimited + priority support. All plans include a 14-day free trial.",
                  sourceType: "TEXT",
                },
              ],
            },
          },
        },
      },
      include: { users: true, chatbots: true },
    });

    return NextResponse.json({
      ok: true,
      orgId: org.id,
      orgSlug: org.slug,
    });
  } catch (e: any) {
    console.error("[register] error", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
