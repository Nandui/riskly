import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { can, type Capability } from "@/lib/permissions";
import type { FormState } from "@/lib/form";

export { can };
export type { Capability };

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

// Resolve the signed-in user with a FRESH role from the DB (so role/active
// changes take effect immediately). Cached per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) return null;

  const { isActive: _isActive, ...rest } = user;
  return rest;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

// Page guard: sends users without the capability back to the dashboard.
export async function requireCapability(
  capability: Capability,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, capability)) redirect("/");
  return user;
}

// Guard for FormState-returning server actions: returns an error state when the
// current user lacks the capability, otherwise null.
export async function denyUnless(
  capability: Capability,
): Promise<FormState | null> {
  const user = await getCurrentUser();
  if (!can(user, capability)) {
    return { ok: false, error: "You don't have permission to do this." };
  }
  return null;
}

// Guard for void server actions: throws when the user lacks the capability.
export async function assertCan(capability: Capability): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user, capability)) {
    throw new Error("Forbidden: insufficient permissions.");
  }
}
