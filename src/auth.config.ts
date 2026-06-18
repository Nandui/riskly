import type { NextAuthConfig } from "next-auth";

// Edge-safe config shared with the proxy gate (src/proxy.ts). Deliberately has
// NO providers and NO database access — the Credentials provider needs Node
// (bcrypt + Prisma), so it lives in auth.ts. The proxy only reads the session
// cookie to decide whether a request is authenticated.
export default {
  providers: [],
  pages: { signIn: "/signin" },
  callbacks: {
    // Used by the proxy to gate every protected route.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
