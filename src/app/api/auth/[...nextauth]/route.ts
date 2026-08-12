import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Fail fast with a clear error if the secret is missing. This makes
// debugging on Vercel much easier — instead of a generic "Server error"
// on /api/auth/error, the Vercel function logs will show exactly what's
// wrong.
if (!process.env.NEXTAUTH_SECRET) {
  console.error(
    "[auth] FATAL: NEXTAUTH_SECRET is not set. " +
      "Add it in Vercel → Settings → Environment Variables."
  );
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
