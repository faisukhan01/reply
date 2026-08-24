"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Bot,
  BookOpen,
  Palette,
  Code2,
  LayoutDashboard,
  Inbox,
  MessageSquare,
  ChevronRight,
  Check,
} from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "replyai-onboarding-dismissed";

const steps = [
  {
    title: "Welcome to ReplyAI",
    description:
      "Your AI-powered customer support platform is ready. Let's get you set up in just a few steps.",
    icon: Check,
  },
  {
    title: "Set up your AI chatbot",
    description:
      "Configure your chatbot to match your brand and handle customer questions intelligently.",
    icon: Bot,
    tips: [
      { icon: BookOpen, label: "Add knowledge", desc: "Upload docs & FAQs for your bot to reference" },
      { icon: Palette, label: "Set persona", desc: "Define tone, style and greeting message" },
      { icon: Bot, label: "Customize widget", desc: "Match colors, position & branding to your site" },
    ],
  },
  {
    title: "Embed on your website",
    description:
      "Add the chat widget to your site with a single line of code. Works with any website builder.",
    icon: Code2,
  },
  {
    title: "You're all set",
    description:
      "Your chatbot is live and ready to help your visitors. Explore your dashboard to see everything in action.",
    icon: Check,
  },
];

const embedCode = `<script src="https://widget.replyai.com/v1.js"
  data-bot-id="YOUR_BOT_ID"
  async></script>`;

function getInitialOpen(): boolean {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    return !dismissed;
  } catch {
    return false;
  }
}

export function OnboardingModal() {
  const [open, setOpen] = useState(getInitialOpen);
  const [step, setStep] = useState(0);

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLast = step === steps.length - 1;
  const isEmbedStep = step === 2;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-lg p-0">
        <div className="p-6 pb-2">
          <DialogHeader className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-muted/40">
              <Icon className="size-5 text-muted-foreground" />
            </div>
            <DialogTitle className="text-base font-medium tracking-tight">{currentStep.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {currentStep.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="px-6 py-2"
          >
            {step === 1 && currentStep.tips && (
              <div className="space-y-2 pb-2">
                {currentStep.tips.map((tip) => {
                  const TipIcon = tip.icon;
                  return (
                    <div
                      key={tip.label}
                      className="flex items-start gap-3 rounded-md border bg-card p-3"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                        <TipIcon className="size-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{tip.label}</div>
                        <div className="text-xs text-muted-foreground">{tip.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isEmbedStep && (
              <div className="pb-2">
                <div className="rounded-md border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Embed Snippet
                    </span>
                  </div>
                  <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 text-xs font-mono leading-relaxed">
                    <code>{embedCode}</code>
                  </pre>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Copy this snippet and paste it before the closing{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">
                      &lt;/body&gt;
                    </code>{" "}
                    tag on your website.
                  </p>
                </div>
              </div>
            )}

            {isLast && (
              <div className="grid grid-cols-2 gap-2 pb-2">
                {[
                  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
                  { icon: Inbox, label: "Inbox", href: "/conversations" },
                  { icon: MessageSquare, label: "Chatbot", href: "/chatbot" },
                  { icon: BookOpen, label: "Knowledge", href: "/chatbot" },
                ].map((link) => {
                  const LinkIcon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={handleDismiss}
                      className="card-hover flex items-center gap-2 rounded-md border bg-card p-3 text-sm font-medium"
                    >
                      <LinkIcon className="size-4 text-muted-foreground" />
                      {link.label}
                      <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between border-t p-4 pt-3">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-foreground"
                    : i < step
                      ? "w-1.5 bg-foreground/60"
                      : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
                Skip for now
              </Button>
            )}
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLast ? "Get started" : "Next"}
              {!isLast && <ChevronRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
