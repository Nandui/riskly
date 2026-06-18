"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { type FormState } from "@/lib/form";
import { getCurrentUser, can } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

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
  revalidatePath("/users");
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
  revalidatePath("/users");
  return { ok: true };
}
