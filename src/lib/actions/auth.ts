"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { firstAdminSchema } from "@/lib/validation";

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}

// Email + password sign-in. Used by the sign-in form via useActionState, so it
// returns an error string on failure and (on success) lets signIn throw the
// redirect that takes the user to the dashboard.
export async function authenticate(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return error.type === "CredentialsSignin"
        ? "Incorrect email or password."
        : "Something went wrong signing you in.";
    }
    throw error; // re-throw the NEXT_REDIRECT signIn issues on success
  }
}

// First-run bootstrap: with no users yet, create the first Admin and sign them
// in. Re-checks the count server-side so it can't be used once setup is done.
export async function createFirstAdmin(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  if ((await db.user.count()) > 0) {
    return "Setup is already complete — please sign in.";
  }

  const parsed = firstAdminSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Check the form and try again.";
  }

  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) {
    return "That email is already registered.";
  }

  await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      role: "Admin",
      isActive: true,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Admin account created — please sign in.";
    }
    throw error;
  }
}
