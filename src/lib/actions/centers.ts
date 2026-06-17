"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { centerSchema } from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { slugify } from "@/lib/utils";

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.center.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${base}-${i++}`;
  }
}

function revalidateCenters() {
  revalidatePath("/centers");
  revalidatePath("/", "layout");
}

export async function createCenter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = centerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  await db.center.create({
    data: {
      name: d.name,
      slug: await uniqueSlug(d.name),
      address: emptyToNull(d.address),
      contactName: emptyToNull(d.contactName),
      contactEmail: emptyToNull(d.contactEmail),
      phone: emptyToNull(d.phone),
      notes: emptyToNull(d.notes),
    },
  });
  revalidateCenters();
  redirect("/centers");
}

export async function updateCenter(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = centerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  await db.center.update({
    where: { id },
    data: {
      name: d.name,
      slug: await uniqueSlug(d.name, id),
      address: emptyToNull(d.address),
      contactName: emptyToNull(d.contactName),
      contactEmail: emptyToNull(d.contactEmail),
      phone: emptyToNull(d.phone),
      notes: emptyToNull(d.notes),
      isActive: formData.has("isActive"),
    },
  });
  revalidateCenters();
  redirect("/centers");
}

export async function setCenterActive(id: string, isActive: boolean) {
  await db.center.update({ where: { id }, data: { isActive } });
  revalidateCenters();
}

export async function deleteCenter(id: string): Promise<FormState> {
  const assessments = await db.riskAssessment.count({ where: { centerId: id } });
  if (assessments > 0) {
    return {
      ok: false,
      error: `This centre has ${assessments} assessment(s). Archive it instead, or delete its assessments first.`,
    };
  }
  await db.center.delete({ where: { id } });
  revalidateCenters();
  redirect("/centers");
}
