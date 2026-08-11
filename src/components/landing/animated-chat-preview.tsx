"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";

const chatScenarios = [
  {
    visitor: "Hi! What are your business hours? 🕐",
    bot: "We're open Mon–Fri, 9 AM to 6 PM. But I'm here 24/7 to help! 😊",
  },
  {
    visitor: "Can I get a refund?",
    bot: "Absolutely! We offer a 30-day money-back guarantee, no questions asked. 💰",
  },
  {
    visitor: "Do you ship internationally? 🌍",
    bot: "Yes! We ship to 50+ countries. Delivery typically takes 3-7 business days. 📦",
  },
  {
    visitor: "How do I reset my password?",
    bot: "Click 'Forgot Password' on the login page, and we'll send a reset link to your email. 🔐",
  },
];

export function AnimatedChatPreview() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [showBotReply, setShowBotReply] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setShowBotReply(false);
        setScenarioIndex((prev) => (prev + 1) % chatScenarios.length);
        setIsVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(() => setShowBotReply(true), 800);
      return () => clearTimeout(t);
    }
  }, [isVisible, scenarioIndex]);

  const scenario = chatScenarios[scenarioIndex];

  return (
    <div className="rounded-2xl border bg-card/95 backdrop-blur shadow-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Bot className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold">ReplyAI Assistant</div>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
          Online
        </span>
      </div>
      <div className="space-y-2 text-xs min-h-[80px]">
        <AnimatePresence mode="wait">
          {isVisible && (
            <motion.div
              key={scenarioIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-muted rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
                {scenario.visitor}
              </div>
              {showBotReply && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="bg-violet-600 text-white rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] ml-auto mt-2"
                >
                  {scenario.bot}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
