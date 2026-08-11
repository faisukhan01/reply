import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      orgId: string;
      orgSlug: string;
      orgName: string;
      role: string;
    };
  }

  interface User {
    orgId: string;
    orgSlug: string;
    orgName: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    orgId: string;
    orgSlug: string;
    orgName: string;
    role: string;
  }
}
