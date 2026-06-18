import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { db } from "@/lib/db";

function list(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const adminEmails = list(process.env.AUTH_ADMIN_EMAILS);
const allowedEmails = list(process.env.AUTH_ALLOWED_EMAILS);
const allowedDomains = list(process.env.AUTH_ALLOWED_DOMAINS);

// Who is permitted to sign in: an admin email, an explicitly allowed email,
// or anyone on an allowed Google Workspace domain.
function isAllowed(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (adminEmails.includes(e) || allowedEmails.includes(e)) return true;
  const domain = e.split("@")[1] ?? "";
  return allowedDomains.includes(domain);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    signIn({ user, profile }) {
      const verified = (profile as { email_verified?: boolean } | undefined)
        ?.email_verified;
      if (verified === false) return false;
      return isAllowed(user.email ?? (profile?.email as string | undefined));
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Bootstrap admins: the configured admin emails get the Admin role.
    async createUser({ user }) {
      const email = user.email?.toLowerCase();
      if (email && adminEmails.includes(email) && user.id) {
        await db.user.update({
          where: { id: user.id },
          data: { role: "Admin" },
        });
      }
    },
  },
});
