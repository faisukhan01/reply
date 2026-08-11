import Link from "next/link";
import { Sparkles, Bot, MessageSquare, BarChart3, Zap, Shield, Globe, Code2, ArrowRight, Check, Star, Wand2, Command, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Hero3D } from "@/components/three/hero-3d";
import { FadeIn, StaggerContainer, StaggerItem, ScaleIn } from "@/components/landing/scroll-animations";
import { AnimatedChatPreview } from "@/components/landing/animated-chat-preview";
import { AnimatedCounter } from "@/components/landing/animated-counter";

export const dynamic = "force-static";

const features = [
  {
    icon: Bot,
    title: "AI that actually understands",
    desc: "Upload your FAQs, docs, and policies. ReplyAI learns your business and answers customers instantly — 24/7, in any language.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: MessageSquare,
    title: "Seamless human handoff",
    desc: "When a conversation needs a human touch, the AI hands off to your team in the live inbox — with full context preserved.",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    icon: BarChart3,
    title: "Analytics that matter",
    desc: "Resolution rate, response time, satisfaction scores, topic clusters. Know exactly how your support is performing.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Code2,
    title: "Embed in 30 seconds",
    desc: "One line of script. Works on any website — WordPress, Shopify, custom. Customize colors, position, and personality.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Wand2,
    title: "AI summary & suggestions",
    desc: "Every conversation gets an instant AI summary. Agents get 3 suggested replies to pick from — cut response time by 70%.",
    color: "from-violet-500 to-fuchsia-600",
  },
  {
    icon: Command,
    title: "Built for speed",
    desc: "Command palette (⌘K), quick replies, dark mode, real-time sync. Your team will move faster than ever.",
    color: "from-purple-500 to-violet-600",
  },
];

const stats = [
  { value: "24/7", label: "Always available", prefix: "", suffix: "", animated: false },
  { value: "85", label: "Avg. auto-resolution", prefix: "", suffix: "%", animated: true },
  { value: "2", label: "Response time (secs)", prefix: "<", suffix: "s", animated: true },
  { value: "50", label: "Languages", prefix: "", suffix: "+", animated: true },
];

const testimonials = [
  { quote: "ReplyAI handles 80% of our support tickets automatically. Our team can finally focus on complex issues.", name: "Sarah Chen", role: "Head of Support, TechFlow", avatar: "SC" },
  { quote: "Setup took 10 minutes. Within a week, our response time dropped from 4 hours to under 2 seconds.", name: "Marcus Williams", role: "CEO, ShipFast", avatar: "MW" },
  { quote: "The AI actually understands our product. Customers can't tell they're chatting with a bot.", name: "Priya Sharma", role: "CX Lead, CloudNest", avatar: "PS" },
];

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    desc: "For small businesses getting started",
    features: ["1 AI chatbot", "1,000 conversations/mo", "Knowledge base (50 docs)", "Email support", "Basic analytics"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/mo",
    desc: "For growing teams that need more",
    features: ["3 AI chatbots", "10,000 conversations/mo", "Knowledge base (500 docs)", "Live inbox + human handoff", "Advanced analytics", "Priority support", "Custom branding"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Scale",
    price: "$199",
    period: "/mo",
    desc: "For high-volume operations",
    features: ["Unlimited chatbots", "Unlimited conversations", "Unlimited knowledge base", "Team collaboration", "API & webhooks", "Dedicated manager", "SLA 99.9%"],
    cta: "Contact sales",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">ReplyAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/widget-demo" className="hover:text-foreground transition-colors">Demo</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero with 3D */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center relative">
          <div className="space-y-7 text-center lg:text-left animate-fade-in-up">
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium gap-1.5 animate-gradient bg-gradient-to-r from-violet-100 via-fuchsia-100 to-violet-100 dark:from-violet-950/40 dark:via-fuchsia-950/40 dark:to-violet-950/40 border-violet-200 dark:border-violet-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              New: AI Summary & Reply Suggestions now live
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Your AI support agent that{" "}
              <span className="gradient-text animate-gradient">never sleeps</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Deploy an AI chatbot that answers your customers instantly — trained on your
              knowledge base, available 24/7, with seamless human handoff. Set it up in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button size="lg" asChild className="h-12 text-base shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] transition-all">
                <Link href="/signup">
                  Start free trial <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 text-base">
                <Link href="/widget-demo">See live demo</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">No credit card required · 14-day free trial · Cancel anytime</p>
          </div>

          {/* 3D canvas */}
          <div className="relative h-[360px] md:h-[480px] lg:h-[520px]">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent" />
            <Hero3D />
            {/* Animated chat preview card */}
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-80">
              <AnimatedChatPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <FadeIn className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text">
                {s.animated ? (
                  <AnimatedCounter target={s.value} prefix={s.prefix} suffix={s.suffix} />
                ) : (
                  s.value
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 md:px-6 py-20">
        <FadeIn className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="secondary" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything you need to automate support
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Stop losing customers to slow responses. ReplyAI handles the repetitive 80% so your team focuses on what matters.
          </p>
        </FadeIn>
        <StaggerContainer className="grid sm:grid-cols-2 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <StaggerItem key={f.title}>
                <Card className="p-6 hover:shadow-lg hover-lift transition-all group border-border/60">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 md:px-6 pb-20">
        <FadeIn className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="secondary" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Loved by support teams everywhere
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Thousands of businesses trust ReplyAI to deliver instant, accurate customer support.
          </p>
        </FadeIn>
        <StaggerContainer className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <Card className="p-6 relative hover:shadow-lg transition-all group">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-violet-500/10 group-hover:text-violet-500/20 transition-colors" />
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Extra trust strip */}
      <FadeIn className="mx-auto max-w-7xl px-4 md:px-6 pb-20 grid md:grid-cols-3 gap-4">
        {[
          { icon: Shield, title: "SOC 2 ready", desc: "Your data is encrypted & isolated per tenant." },
          { icon: Globe, title: "Multi-language", desc: "Detect & reply in 50+ languages automatically." },
          { icon: Zap, title: "Lightning fast", desc: "Sub-2-second AI responses, every time." },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <ScaleIn key={t.title} className="flex items-start gap-3 p-5 rounded-xl border bg-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">{t.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
              </div>
            </ScaleIn>
          );
        })}
      </FadeIn>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-20">
          <FadeIn className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Start free. Upgrade when you grow. Cancel anytime.
            </p>
          </FadeIn>
          <StaggerContainer className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p) => (
              <StaggerItem key={p.name}>
                <Card
                  className={`p-6 relative hover:shadow-xl transition-all duration-300 group ${p.highlight ? "border-violet-500 shadow-xl shadow-violet-500/10 md:-translate-y-2" : "hover:border-violet-300"}`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-3 py-1 shadow-md">
                        Most popular
                      </Badge>
                    </div>
                  )}
                  <div className="text-sm font-semibold text-muted-foreground">{p.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold group-hover:scale-105 transition-transform origin-left">{p.price}</span>
                    <span className="text-muted-foreground">{p.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{p.desc}</p>
                  <Button
                    className="w-full mt-5"
                    variant={p.highlight ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/signup">{p.cta}</Link>
                  </Button>
                  <ul className="mt-6 space-y-2.5">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-20">
        <FadeIn className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-8 py-16 md:py-20 text-center text-white">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative space-y-6">
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-white text-white" />
              ))}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-2xl mx-auto">
              Ready to never miss a customer again?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto text-lg">
              Join 5,000+ businesses automating their support with ReplyAI. Set up in minutes.
            </p>
            <Button size="lg" variant="secondary" asChild className="h-12 text-base">
              <Link href="/signup">
                Get started free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-10 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold">ReplyAI</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              The AI customer support platform that helps businesses answer faster, convert more, and delight every customer.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link href="/widget-demo" className="hover:text-foreground">Live demo</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Company</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground">Sign in</Link></li>
              <li><Link href="/signup" className="hover:text-foreground">Get started</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>© {new Date().getFullYear()} ReplyAI. All rights reserved.</div>
            <div>Built for founders who ship.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
