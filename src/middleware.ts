import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Edge-safe middleware: redirects unauthenticated users to /signin.
export default NextAuth(authConfig).auth;

export const config = {
  // Protect everything except the sign-in page, the auth API, and static assets.
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)"],
};
