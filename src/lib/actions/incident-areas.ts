"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { taxonomySchema } from "@/lib/validation";
import { fieldErrorsFromZod, emptyToNull, type FormState } from "@/lib/form";
import { denyUnless } from "@/lib/auth";

// Sub-area admin (the finer incident-location level under a shared Area). Areas
// themselves are managed in the Library; this mirrors that pattern for the
// SubArea child rows.

function revalidateLocations() {
  revalidatePath("/admin");
  revalidatePath("/incidents");
}

function parseEntity(formData: FormData) {
  return taxonomySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
}

export async function createSubArea(
  areaId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!areaId) return { ok: false, error: "Select an area first." };
  const denied = await denyUnless("editContent");
  if (denied) return denied;

  const area = await db.area.findUnique({ where: { id: areaId }, select: { id: true } });
  if (!area) return { ok: false, error: "Area not found." };

  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  const max = await db.subArea.aggregate({
    where: { areaId },
    _max: { sortOrder: true },
  });
  await db.subArea.create({
    data: {
      areaId,
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  revalidateLocations();
  return { ok: true };
}

export async function updateSubArea(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;

  const parsed = parseEntity(formData);
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };

  await db.subArea.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
    },
  });
  revalidateLocations();
  return { ok: true };
}

export async function deleteSubArea(id: string): Promise<FormState> {
  const denied = await denyUnless("editContent");
  if (denied) return denied;

  const count = await db.incident.count({ where: { subAreaId: id } });
  if (count > 0)
    return {
      ok: false,
      error: `In use by ${count} incident(s) — reassign them first.`,
    };
  await db.subArea.delete({ where: { id } });
  revalidateLocations();
  return { ok: true };
}
