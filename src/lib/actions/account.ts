"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { type FormState, fieldErrorsFromZod } from "@/lib/form";
import { passwordChangeSchema } from "@/lib/validation";

// Lets any signed-in user change their own password (verifying the current one).
export async function changeOwnPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You're not signed in." };

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const user = await db.user.findUnique({
    where: { id: me.id },
    select: { passwordHash: true },
  });
  if (
    !user?.passwordHash ||
    !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))
  ) {
    return {
      ok: false,
      fieldErrors: { currentPassword: "That isn't your current password." },
    };
  }

  await db.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  return { ok: true };
}
