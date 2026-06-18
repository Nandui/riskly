import { db } from "@/lib/db";
import { SignInForm } from "@/components/auth/signin-form";
import { FirstRunSetup } from "@/components/auth/first-run-setup";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  // With no users yet, show the one-time "create the first admin" setup.
  const hasUsers = (await db.user.count()) > 0;

  return (
    <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center shadow-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Riskly" className="mx-auto mb-4 size-16" />
      <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
        {hasUsers ? "Sign in to Riskly" : "Welcome to Riskly"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {hasUsers
          ? "Enter your email and password."
          : "Create the first administrator account to get started."}
      </p>

      {hasUsers ? <SignInForm /> : <FirstRunSetup />}

      <p className="mt-6 text-xs text-faint">
        {hasUsers
          ? "Access is restricted to authorised LeisureWorld staff."
          : "You can add the rest of your team once you're signed in."}
      </p>
    </div>
  );
}
