import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config (no database/adapter) — shared with the middleware.
// Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment.
export default {
  providers: [Google],
  pages: { signIn: "/signin" },
  callbacks: {
    // Used by the middleware to gate every protected route.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
