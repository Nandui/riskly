import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Proxy (formerly "middleware", renamed in Next.js 16): redirects
// unauthenticated users to /signin. Uses the edge-safe auth config (no
// Prisma) so it stays lightweight wherever it runs.
export default NextAuth(authConfig).auth;

export const config = {
  // Protect everything except the sign-in page, the auth API, and static assets.
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)"],
};
