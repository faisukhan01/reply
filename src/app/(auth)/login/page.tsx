"use client";

import { useState, Suspense, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function LoginForm() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("demo@replyai.app");
  const [password, setPassword] = useState("demo1234");

  // If redirected back here with ?error=..., show a toast.
  useEffect(() => {
    const err = params.get("error");
    if (err) {
      toast.error("Invalid email or password. Please try again.");
    }
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // redirect: true → NextAuth does a FULL server-side redirect.
    // The server sets the session cookie AND returns a 302 to /dashboard
    // in the same response. The browser follows the redirect with the
    // cookie already stored. No client-side race condition possible.
    // This is the bulletproof approach for Vercel/serverless.
    const callbackUrl = params.get("callbackUrl") || "/dashboard";
    await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl,
    });
    // If signIn returns (i.e., redirect didn't happen), credentials were wrong.
    // NextAuth will have already redirected to /login?error=... in that case,
    // but just in case:
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm mx-auto py-10">
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="text-sm text-muted-foreground mt-1.5">
        Sign in to your ReplyAI dashboard
      </p>

      <div className="mt-4 mb-6 rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-900 px-3 py-2.5 text-xs text-violet-700 dark:text-violet-300">
        <span className="font-semibold">Demo account:</span> demo@replyai.app / demo1234
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full h-10" disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
          ) : (
            <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-violet-600 hover:underline font-medium">
          Sign up free
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left: form */}
        <div className="flex flex-col p-6 md:p-10">
          <Link href="/" className="flex items-center gap-2.5 mb-auto">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">ReplyAI</span>
          </Link>

          <Suspense fallback={
            <div className="w-full max-w-sm mx-auto py-10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          }>
            <LoginForm />
          </Suspense>

          <div className="text-xs text-muted-foreground text-center mt-auto">
            © {new Date().getFullYear()} ReplyAI
          </div>
        </div>

        {/* Right: visual */}
        <div className="hidden lg:flex relative items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative max-w-md text-white space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Trusted by 5,000+ businesses
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              Automate your support. Delight your customers.
            </h2>
            <p className="text-white/80 text-lg">
              ReplyAI answers 85% of questions instantly — so your team can focus on the conversations that truly need a human.
            </p>
            <div className="space-y-3 pt-4">
              {[
                "AI trained on your knowledge base",
                "Live inbox with human handoff",
                "Real-time analytics & insights",
              ].map((t) => (
                <div key={t} className="flex items-center gap-3 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</div>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
