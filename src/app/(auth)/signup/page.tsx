"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Sparkles, Loader2, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    orgName: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Signup failed");
        setLoading(false);
        return;
      }
      // auto sign-in
      const r = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (r?.error || !r?.ok) {
        toast.success("Account created. Please sign in.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 400);
      } else {
        toast.success("Account created! Welcome to ReplyAI 🎉");
        // Hard navigation so the new session cookie is sent on the next
        // request. router.push can race with cookie propagation on Vercel.
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 400);
      }
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left: visual */}
        <div className="hidden lg:flex relative items-center justify-center bg-gradient-to-br from-fuchsia-600 via-violet-600 to-purple-700 p-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative max-w-md text-white space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Start automating your support in minutes
            </h2>
            <p className="text-white/80 text-lg">
              14-day free trial. No credit card. Set up your AI chatbot today.
            </p>
            <div className="space-y-3 pt-4">
              {[
                "Free 14-day trial — no card needed",
                "Cancel anytime, keep your data",
                "Setup in under 5 minutes",
                "Works on any website",
              ].map((t) => (
                <div key={t} className="flex items-center gap-3 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="flex flex-col p-6 md:p-10">
          <Link href="/" className="flex items-center gap-2.5 mb-auto ml-auto">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">ReplyAI</span>
          </Link>

          <div className="w-full max-w-sm mx-auto py-8">
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Start your 14-day free trial
            </p>

            <form onSubmit={onSubmit} className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label htmlFor="orgName">Company / Organization</Label>
                <Input
                  id="orgName"
                  required
                  value={form.orgName}
                  onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                />
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
                ) : (
                  <>Create account <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <p className="text-sm text-muted-foreground text-center mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-violet-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
          <div className="text-xs text-muted-foreground text-center mt-auto">
            © {new Date().getFullYear()} ReplyAI
          </div>
        </div>
      </div>
    </div>
  );
}
