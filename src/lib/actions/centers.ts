"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { centerSchema } from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { slugify } from "@/lib/utils";
import { denyUnless, assertCan } from "@/lib/auth";

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
  revalidateTag("centers", { expire: 0 });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

// Renumber a centre's assessments to RA-{CODE}-{NNNN} (creation order). Two
// passes so we never collide with an existing unique reference mid-update.
async function renumberCenterAssessments(centerId: string, code: string) {
  const list = await db.riskAssessment.findMany({
    where: { centerId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (list.length === 0) return;
  for (const a of list) {
    await db.riskAssessment.update({
      where: { id: a.id },
      data: { reference: `__tmp_${a.id}` },
    });
  }
  for (let i = 0; i < list.length; i++) {
    await db.riskAssessment.update({
      where: { id: list[i].id },
      data: { reference: `RA-${code}-${String(i + 1).padStart(4, "0")}` },
    });
  }
}

export async function createCenter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("admin");
  if (denied) return denied;

  const parsed = centerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const code = d.siteCode.toUpperCase();
  const clash = await db.center.findFirst({
    where: { siteCode: code },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: `Site code "${code}" is already used by another centre.`,
      fieldErrors: { siteCode: "Already in use" },
    };
  }
  await db.center.create({
    data: {
      name: d.name,
      slug: await uniqueSlug(d.name),
      siteCode: code,
      address: emptyToNull(d.address),
      contactName: emptyToNull(d.contactName),
      contactEmail: emptyToNull(d.contactEmail),
      phone: emptyToNull(d.phone),
      notes: emptyToNull(d.notes),
    },
  });
  revalidateCenters();
  redirect("/admin");
}

export async function updateCenter(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("admin");
  if (denied) return denied;

  const parsed = centerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const d = parsed.data;
  const code = d.siteCode.toUpperCase();
  const clash = await db.center.findFirst({
    where: { siteCode: code, NOT: { id } },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: `Site code "${code}" is already used by another centre.`,
      fieldErrors: { siteCode: "Already in use" },
    };
  }
  const previous = await db.center.findUnique({
    where: { id },
    select: { siteCode: true },
  });
  await db.center.update({
    where: { id },
    data: {
      name: d.name,
      slug: await uniqueSlug(d.name, id),
      siteCode: code,
      address: emptyToNull(d.address),
      contactName: emptyToNull(d.contactName),
      contactEmail: emptyToNull(d.contactEmail),
      phone: emptyToNull(d.phone),
      notes: emptyToNull(d.notes),
      isActive: formData.has("isActive"),
    },
  });
  // Adopting or changing the site code renumbers this centre's references.
  if ((previous?.siteCode ?? null) !== code) {
    await renumberCenterAssessments(id, code);
  }
  revalidateCenters();
  redirect("/admin");
}

export async function setCenterActive(id: string, isActive: boolean) {
  await assertCan("admin");
  await db.center.update({ where: { id }, data: { isActive } });
  revalidateCenters();
}

export async function deleteCenter(id: string): Promise<FormState> {
  const denied = await denyUnless("admin");
  if (denied) return denied;

  const assessments = await db.riskAssessment.count({ where: { centerId: id } });
  if (assessments > 0) {
    return {
      ok: false,
      error: `This centre has ${assessments} assessment(s). Archive it instead, or delete its assessments first.`,
    };
  }
  await db.center.delete({ where: { id } });
  revalidateCenters();
  redirect("/admin");
}
