"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { type FormState, fieldErrorsFromZod } from "@/lib/form";
import { getCurrentUser, can } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { ROLES } from "@/lib/constants";
import { userCreateSchema, passwordResetSchema } from "@/lib/validation";

const ROLE_VALUES = ROLES.map((r) => r.value) as string[];

export async function setUserRole(
  userId: string,
  role: string,
): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me || !can(me, "admin")) return { ok: false, error: "Admins only." };
  if (!ROLE_VALUES.includes(role)) return { ok: false, error: "Invalid role." };
  if (userId === me.id) {
    return { ok: false, error: "You can't change your own role." };
  }
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me || !can(me, "admin")) return { ok: false, error: "Admins only." };
  if (userId === me.id) {
    return { ok: false, error: "You can't deactivate your own account." };
  }
  await db.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin");
  return { ok: true };
}

// Admin creates a new user with an initial password. They sign in with that
// email + password and can change it from their account page.
export async function createUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me || !can(me, "admin")) return { ok: false, error: "Admins only." };

  const parsed = userCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) {
    return { ok: false, error: "A user with that email already exists." };
  }

  await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      isActive: true,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  revalidatePath("/admin");
  return { ok: true };
}

// Admin sets a new password for someone (e.g. they forgot theirs).
export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me || !can(me, "admin")) return { ok: false, error: "Admins only." };

  const parsed = passwordResetSchema.safeParse({ userId, password });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid password.",
    };
  }

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  return { ok: true };
}
