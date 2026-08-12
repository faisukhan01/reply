import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  // Trust the Host header on Vercel so cookies/callbacks use the correct
  // domain. This is the documented serverless approach for NextAuth v4.
  // Combined with NEXTAUTH_URL env var (set on Vercel), this makes cookie
  // domain + callback URL resolution work correctly.
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { org: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // custom fields passed via JWT
          orgId: user.orgId,
          orgSlug: user.org.slug,
          orgName: user.org.name,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.orgId = (user as any).orgId;
        token.orgSlug = (user as any).orgSlug;
        token.orgName = (user as any).orgName;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).orgId = token.orgId;
        (session.user as any).orgSlug = token.orgSlug;
        (session.user as any).orgName = token.orgName;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  // CRITICAL: must be set. NextAuth throws "Server error" on /api/auth/error
  // if this is missing or empty. Set NEXTAUTH_URL + NEXTAUTH_SECRET on Vercel.
  secret: process.env.NEXTAUTH_SECRET,
};
