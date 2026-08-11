import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const VISITOR_NAMES = [
  "Ayesha Khan", "Bilal Ahmed", "Fatima Noor", "Usman Tariq", "Zainab Ali",
  "Hamza Raza", "Mariam Saleem", "Ali Hassan", "Sana Iqbal", "Bilal Shah",
  "Hira Malik", "Omar Farooq", "Aisha Bibi", "Danish Kamran", "Noor Fatima",
];

const SAMPLE_QS = [
  "Hi, what are your business hours?",
  "How much does the Pro plan cost?",
  "Can I get a refund?",
  "Do you support integrations with Slack?",
  "I'm having trouble logging into my account",
  "What's your refund policy?",
  "Can I upgrade my plan later?",
  "Do you offer student discounts?",
  "How do I cancel my subscription?",
  "Is there a free trial?",
  "Can I talk to a human agent?",
  "What payment methods do you accept?",
];

const SAMPLE_AS = [
  "We're open Monday to Friday, 9 AM to 6 PM. Our AI assistant is available 24/7 though! 😊",
  "Our Pro plan is $79/month which includes up to 10,000 conversations plus advanced analytics. Would you like me to set that up for you?",
  "Absolutely! We offer a 30-day money-back guarantee, no questions asked. Just email support and we'll process it within 3-5 business days.",
  "Yes! We integrate with Slack, WhatsApp, email, and 50+ other tools. The Slack integration lets you get notified of new conversations right in your channels.",
  "I'm sorry to hear that! Let me help. Could you share the email address on your account? I'll also connect you with a human agent to resolve this quickly.",
  "We have a 30-day money-back guarantee on all plans. No questions asked — just reach out to support@example.com.",
  "Yes, you can upgrade anytime from your dashboard. The change is prorated automatically. Want me to walk you through it?",
  "We do offer 50% off for verified students! Just email us your student ID and we'll set it up.",
  "You can cancel anytime from Settings → Billing. Your access continues until the end of your billing period.",
  "Yes! Every plan includes a 14-day free trial — no credit card required. Want to start one?",
  "Of course! Let me connect you with one of our team members right away. What's the best way to reach you?",
  "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual plans.",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

async function main() {
  console.log("🌱 Seeding ReplyAI demo data...");

  const email = "demo@replyai.app";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists. Skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const org = await db.organization.create({
    data: {
      name: "Acme Support Co",
      slug: "acme",
      plan: "PRO",
      users: {
        create: {
          name: "Demo Owner",
          email,
          passwordHash,
          role: "OWNER",
        },
      },
      chatbots: {
        create: {
          name: "Acme Support Bot",
          welcomeMessage: "Hi there! 👋 I'm Acme's AI assistant. How can I help you today?",
          persona: "friendly",
          systemPrompt:
            "You are a helpful customer support assistant for Acme. Answer based on the knowledge base. Be concise, warm, and proactive.",
          primaryColor: "#8b5cf6",
          status: "ACTIVE",
          faqs: {
            create: [
              { question: "What are your business hours?", answer: "Mon–Fri, 9 AM to 6 PM. AI assistant available 24/7." },
              { question: "What is your refund policy?", answer: "30-day money-back guarantee, no questions asked." },
              { question: "Do you offer student discounts?", answer: "Yes, 50% off for verified students." },
              { question: "How do I cancel?", answer: "Settings → Billing → Cancel. Access continues till period end." },
            ],
          },
          knowledge: {
            create: [
              { title: "Company Overview", content: "Acme builds productivity tools for SMBs. Founded 2023, 5,000+ customers.", sourceType: "TEXT" },
              { title: "Pricing", content: "Starter $29/mo (1k convos). Pro $79/mo (10k + analytics). Scale $199/mo (unlimited + priority). 14-day free trial.", sourceType: "TEXT" },
              { title: "Integrations", content: "Slack, WhatsApp, Email, 50+ tools. REST API + Webhooks available.", sourceType: "TEXT" },
            ],
          },
        },
      },
    },
    include: { chatbots: true },
  });

  const chatbot = org.chatbots[0];

  // Generate ~28 conversations across last 14 days
  let totalMessages = 0;
  for (let i = 0; i < 28; i++) {
    const daysBack = Math.floor(Math.random() * 14);
    const createdAt = daysAgo(daysBack);
    const visitorName = randomFrom(VISITOR_NAMES);
    const numExchanges = 1 + Math.floor(Math.random() * 4); // 1-4 Q&A pairs
    const status = Math.random() > 0.8 ? (Math.random() > 0.5 ? "HUMAN" : "CLOSED") : "AI";
    const satisfaction = status === "CLOSED" ? Math.floor(Math.random() * 5) + 1 : null;

    const messages: { role: string; content: string; createdAt: Date }[] = [];
    let msgTime = new Date(createdAt);
    for (let j = 0; j < numExchanges; j++) {
      const q = SAMPLE_QS[j % SAMPLE_QS.length];
      const a = SAMPLE_AS[j % SAMPLE_AS.length];
      messages.push({ role: "VISITOR", content: q, createdAt: new Date(msgTime) });
      msgTime = new Date(msgTime.getTime() + 20000 + Math.random() * 40000);
      messages.push({ role: "AI", content: a, createdAt: new Date(msgTime) });
      msgTime = new Date(msgTime.getTime() + 30000 + Math.random() * 60000);
    }

    const conversation = await db.conversation.create({
      data: {
        chatbotId: chatbot.id,
        visitorId: `visitor-${i}-${Date.now()}`,
        visitorName,
        visitorEmail: `${visitorName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
        status,
        satisfaction,
        channel: "WIDGET",
        createdAt,
        updatedAt: msgTime,
        messages: { create: messages },
      },
    });
    totalMessages += messages.length;

    // Also create a contact for some
    if (Math.random() > 0.5) {
      await db.contact.create({
        data: {
          orgId: org.id,
          name: visitorName,
          email: `${visitorName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
          phone: Math.random() > 0.6 ? `+92 3${Math.floor(Math.random() * 90000000) + 10000000}` : null,
          source: "WIDGET",
          notes: randomFrom(["Interested in Pro plan", "Asked about integrations", "Wants a demo", "Price sensitive", "Enterprise lead"]),
          createdAt,
        },
      });
    }
  }

  console.log(`✅ Seeded: 1 org, 1 chatbot, 28 conversations, ${totalMessages} messages, contacts.`);
  console.log("   Login: demo@replyai.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
