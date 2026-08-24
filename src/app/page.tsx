import Link from "next/link";
import {
  Bot, MessageSquare, BarChart3, Shield, Globe, ArrowRight, Check,
  Calendar, Send, Users, Zap, Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

export const dynamic = "force-static";

const features = [
  {
    icon: Plug,
    title: "Connect every channel",
    desc: "OAuth into Facebook, Instagram, WhatsApp Business, and LinkedIn from one dashboard. ReplyAI normalizes each platform's quirks into a single message model.",
  },
  {
    icon: Calendar,
    title: "Schedule, not just send",
    desc: "Compose a message, pick a time, pick a platform. ReplyAI's scheduler dispatches at the right moment and respects each platform's rate limits and quiet hours.",
  },
  {
    icon: Bot,
    title: "AI that actually understands",
    desc: "Train your assistant on your FAQs, docs, and policies. It answers customers 24/7, in any language, and hands off to your team when context demands a human.",
  },
  {
    icon: MessageSquare,
    title: "Unified inbox",
    desc: "Every conversation from every platform lands in one inbox with full context. Tag, assign, summarize, and resolve — without switching tabs.",
  },
  {
    icon: BarChart3,
    title: "Analytics that matter",
    desc: "Resolution rate, response time, satisfaction, topic clusters. Know exactly how your support is performing across every channel.",
  },
  {
    icon: Shield,
    title: "Audit-ready by default",
    desc: "Every scheduled message, every AI reply, every agent action is logged. Export to CSV in one click for compliance reviews.",
  },
];

const platforms = [
  { name: "Facebook", desc: "Pages & Messenger" },
  { name: "Instagram", desc: "Direct messages" },
  { name: "WhatsApp", desc: "Business API" },
  { name: "LinkedIn", desc: "Messages & Posts" },
];

const stats = [
  { label: "Messages dispatched", value: "12.4M" },
  { label: "AI resolution rate", value: "85%" },
  { label: "Avg response time", value: "1.2s" },
  { label: "Teams onboarded", value: "5,000+" },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    description: "For solo founders and small teams getting started.",
    features: [
      "1 connected platform",
      "Up to 1,000 scheduled messages / mo",
      "AI assistant with 50 knowledge docs",
      "Unified inbox (1 seat)",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$79",
    period: "/mo",
    description: "For growing support teams that need analytics.",
    features: [
      "4 connected platforms",
      "Up to 10,000 scheduled messages / mo",
      "AI assistant with unlimited docs",
      "Unified inbox (5 seats)",
      "Advanced analytics + export",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Scale",
    price: "$199",
    period: "/mo",
    description: "For high-volume teams with compliance needs.",
    features: [
      "All platforms, unlimited",
      "Unlimited scheduled messages",
      "Unlimited seats",
      "Audit logs + SSO",
      "Dedicated CSM",
      "99.9% uptime SLA",
    ],
  },
];

const faqs = [
  {
    q: "How does ReplyAI integrate with Facebook and Instagram?",
    a: "We use the official Meta Graph API. You connect your Facebook Page via OAuth, and Instagram Professional accounts attached to that Page are auto-discovered. Messages flow through the unified inbox; replies are sent back through the same channel they came from.",
  },
  {
    q: "Do you support WhatsApp Business?",
    a: "Yes — we use the WhatsApp Business Cloud API. You'll need a verified Meta Business Manager account and a WhatsApp Business phone number. ReplyAI handles template message approval, session messages, and 24-hour window enforcement automatically.",
  },
  {
    q: "Can I schedule LinkedIn posts and messages?",
    a: "Yes. Through the LinkedIn Marketing API, you can schedule both feed posts and direct messages. LinkedIn's API has stricter rate limits than Meta's, so we batch and throttle automatically to keep your account in good standing.",
  },
  {
    q: "What happens if a scheduled message fails?",
    a: "ReplyAI retries three times with exponential backoff. If all retries fail, the message is marked as failed with the platform's exact error code, and you get a notification. You can reschedule from the scheduler page with one click.",
  },
  {
    q: "Is my data secure?",
    a: "All OAuth tokens are encrypted at rest with AES-256. PII is never logged. Every action is audit-logged. We're SOC 2 Type II in progress and GDPR/CCPA compliant by design — you can export or delete all customer data from Settings.",
  },
  {
    q: "Can I use the AI assistant without the scheduler?",
    a: "Absolutely. The AI widget, the scheduler, and the unified inbox are independent modules. Use any subset — pricing is per-module so you only pay for what you use.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Nav ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-semibold">R</span>
            </div>
            <span className="font-semibold tracking-tight">ReplyAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#platforms" className="hover:text-foreground transition-colors">Platforms</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="text-sm">
              <Link href="/signup">Start free <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="status-dot status-dot--ok" />
              Multi-platform scheduler now live
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Customer support and message scheduling, in one place.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              ReplyAI answers your customers 24/7 with an AI trained on your
              knowledge base, and schedules outbound messages across Facebook,
              Instagram, WhatsApp, and LinkedIn. One inbox. One audit trail.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Start 14-day free trial <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────── */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums">
                {s.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Platforms ─────────────────────────────────────── */}
      <section id="platforms" className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Platforms
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
              Connect every channel your customers use.
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              OAuth into each platform once. ReplyAI handles the rest — message
              normalization, rate limits, quiet hours, retries, and audit logs.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {platforms.map((p) => (
              <div key={p.name} className="border rounded-lg p-5 bg-card card-hover">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────── */}
      <section id="features" className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Features
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
              Built for support teams who ship, not vibe.
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f) => (
              <div key={f.title} className="border rounded-lg p-6 bg-card card-hover">
                <div className="h-9 w-9 rounded-md border flex items-center justify-center">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-base font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────── */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
              From signup to first scheduled message in 5 minutes.
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Connect your platforms", icon: Plug, desc: "OAuth into Facebook, Instagram, WhatsApp, and LinkedIn from the Connections page. Tokens are encrypted at rest." },
              { step: "02", title: "Compose a message", icon: Send, desc: "Write your message, pick a platform, pick a recipient list, pick a time. Preview how it'll look on each channel." },
              { step: "03", title: "Schedule and track", icon: Calendar, desc: "ReplyAI dispatches at the right moment, retries failures, and logs every send. Track delivery in real time." },
            ].map((s) => (
              <div key={s.step}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md border flex items-center justify-center text-xs font-medium tabular-nums">
                    {s.step}
                  </div>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ───────────────────────────────────────── */}
      <section id="pricing" className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pricing
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
              Per-module pricing. Pay only for what you use.
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricingTiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-lg border p-6 bg-card ${
                  t.highlight ? "border-foreground" : ""
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium">{t.name}</h3>
                  {t.highlight && (
                    <span className="text-xs px-2 py-0.5 rounded border border-foreground">
                      Popular
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums">{t.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">{t.period}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t.description}</p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {t.features.map((feat) => (
                    <li key={feat} className="flex gap-2.5">
                      <Check className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={t.highlight ? "default" : "outline"}
                  className="mt-7 w-full"
                >
                  <Link href="/signup">Start with {t.name}</Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            All plans include a 14-day free trial. Volume discounts available for
            &gt; 100k messages / month.
            <Link href="/signup" className="underline hover:text-foreground">Talk to us →</Link>
          </p>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              FAQ
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
              Common questions.
            </h2>
          </div>
          <Accordion type="single" className="mt-8">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Start scheduling today.
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            14-day free trial. No credit card. Cancel anytime.
          </p>
          <Button asChild size="lg" className="mt-7">
            <Link href="/signup">Create your account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────── */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded bg-foreground flex items-center justify-center">
              <span className="text-background text-[10px] font-semibold">R</span>
            </div>
            <span className="text-muted-foreground">© {new Date().getFullYear()} ReplyAI</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
