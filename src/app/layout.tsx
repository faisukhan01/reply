import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";

/*
 * Typography — Inter, single weight family for the whole product.
 * One sans for everything (body, headings, UI), no display font.
 * Numbers use tabular variants via the .tabular-nums utility.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReplyAI — Customer Support & Multi-Platform Scheduler",
  description:
    "ReplyAI is a customer support platform and multi-platform message scheduler. Connect Facebook, Instagram, WhatsApp, and LinkedIn — schedule messages, automate responses, and track analytics from one dashboard.",
  keywords: [
    "message scheduler",
    "social media automation",
    "customer support",
    "Facebook scheduler",
    "Instagram scheduler",
    "WhatsApp Business",
    "LinkedIn automation",
    "AI chatbot",
  ],
  authors: [{ name: "ReplyAI" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
          <Toaster />
          <SonnerToaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
