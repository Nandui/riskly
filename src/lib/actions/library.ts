"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { taxonomySchema } from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { denyUnless } from "@/lib/auth";

function revalidateLibrary() {
  revalidatePath("/admin");
  revalidatePath("/assessments");
  revalidatePath("/reference");
}

function parseEntity(formData: FormData) {
  return taxonomySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
}

function isUniqueError(e: unknown) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

// ---------------- Areas (per centre) ----------------
export async function createArea(
  centerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!centerId) return { ok: false, error: "Select a centre first." };
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  const max = await db.area.aggregate({
    where: { centerId },
    _max: { sortOrder: true },
  });
  await db.area.create({
    data: {
      centerId,
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  revalidateLibrary();
  return { ok: true };
}

export async function updateArea(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  await db.area.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
    },
  });
  revalidateLibrary();
  return { ok: true };
}

export async function deleteArea(id: string): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const count = await db.riskAssessment.count({ where: { areaId: id } });
  if (count > 0)
    return {
      ok: false,
      error: `In use by ${count} assessment(s) — reassign them first.`,
    };
  await db.area.delete({ where: { id } });
  revalidateLibrary();
  return { ok: true };
}

// ---------------- Roles (org-level) ----------------
export async function createRole(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  try {
    const max = await db.role.aggregate({ _max: { sortOrder: true } });
    await db.role.create({
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
  } catch (e) {
    if (isUniqueError(e))
      return { ok: false, fieldErrors: { name: "A role with this name exists." } };
    throw e;
  }
  revalidateLibrary();
  return { ok: true };
}

export async function updateRole(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  try {
    await db.role.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
  } catch (e) {
    if (isUniqueError(e))
      return { ok: false, fieldErrors: { name: "A role with this name exists." } };
    throw e;
  }
  revalidateLibrary();
  return { ok: true };
}

export async function deleteRole(id: string): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const count = await db.riskAssessment.count({ where: { roleId: id } });
  if (count > 0)
    return { ok: false, error: `In use by ${count} assessment(s).` };
  await db.role.delete({ where: { id } });
  revalidateLibrary();
  return { ok: true };
}

// ---------------- Activities (org-level) ----------------
export async function createActivity(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  try {
    const max = await db.activity.aggregate({ _max: { sortOrder: true } });
    await db.activity.create({
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
  } catch (e) {
    if (isUniqueError(e))
      return {
        ok: false,
        fieldErrors: { name: "An activity with this name exists." },
      };
    throw e;
  }
  revalidateLibrary();
  return { ok: true };
}

export async function updateActivity(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  try {
    await db.activity.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
  } catch (e) {
    if (isUniqueError(e))
      return {
        ok: false,
        fieldErrors: { name: "An activity with this name exists." },
      };
    throw e;
  }
  revalidateLibrary();
  return { ok: true };
}

export async function deleteActivity(id: string): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const count = await db.riskAssessment.count({ where: { activityId: id } });
  if (count > 0)
    return { ok: false, error: `In use by ${count} assessment(s).` };
  await db.activity.delete({ where: { id } });
  revalidateLibrary();
  return { ok: true };
}

// ---------------- Departments (org-level) ----------------
export async function createDepartment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  try {
    const max = await db.department.aggregate({ _max: { sortOrder: true } });
    await db.department.create({
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
  } catch (e) {
    if (isUniqueError(e))
      return {
        ok: false,
        fieldErrors: { name: "A department with this name exists." },
      };
    throw e;
  }
  revalidateLibrary();
  return { ok: true };
}

export async function updateDepartment(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  try {
    await db.department.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
      },
    });
  } catch (e) {
    if (isUniqueError(e))
      return {
        ok: false,
        fieldErrors: { name: "A department with this name exists." },
      };
    throw e;
  }
  revalidateLibrary();
  return { ok: true };
}

export async function deleteDepartment(id: string): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;
  const count = await db.riskAssessment.count({ where: { departmentId: id } });
  if (count > 0)
    return { ok: false, error: `In use by ${count} assessment(s).` };
  await db.department.delete({ where: { id } });
  revalidateLibrary();
  return { ok: true };
}
