"use client";

import { ThemeProvider } from "@/components/theme-provider";

/**
 * Providers component — wraps the app with all client-side context providers.
 *
 * (Removed NextAuth's SessionProvider — we no longer use NextAuth. The
 *  session is read directly from the HTTP-only cookie by the server via
 *  getCurrentUser() in src/lib/session.ts. No client-side session hook is
 *  needed.)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
