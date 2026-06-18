"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { denyUnless, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hazardSchema } from "@/lib/validation";
import { emptyToNull } from "@/lib/form";
import { computeNextReviewDate } from "@/lib/utils";
import { nextReference } from "@/lib/data/assessments";

const payloadSchema = z.object({
  centerId: z.string().min(1, "Choose a centre"),
  subjectType: z.enum(["Area", "Role", "Activity"]),
  subjectId: z.string().optional(),
  newSubjectName: z.string().trim().max(120).optional(),
  status: z.enum(["Draft", "Active", "UnderReview", "Archived"]).default("Active"),
  assessmentDate: z.string().min(1, "Set an assessment date"),
  reviewFrequencyMonths: z.coerce.number().int().min(1).max(60).default(12),
  hazards: z.array(hazardSchema).min(1, "There are no hazards to import"),
});

export type ImportPayload = z.input<typeof payloadSchema>;

export type ImportResult = {
  ok: boolean;
  error?: string;
  assessmentId?: string;
  count?: number;
  replaced?: boolean;
};

function hazardCreateData(hazards: z.infer<typeof payloadSchema>["hazards"]) {
  return hazards.map((h, i) => ({
    sortOrder: i,
    seq: i + 1,
    hazard: h.hazard,
    riskFactor: emptyToNull(h.riskFactor),
    personAtRisk: emptyToNull(h.personAtRisk),
    consequence: emptyToNull(h.consequence),
    currentControls: emptyToNull(h.currentControls),
    likelihood: h.likelihood,
    severity: h.severity,
    riskCategory: h.riskCategory ?? "Physical",
  }));
}

// Create (or replace the hazards of an existing) assessment for one subject from
// imported CSV rows. One subject = one assessment, so re-importing the same area
// updates it rather than creating a duplicate.
export async function importAssessment(
  input: ImportPayload,
): Promise<ImportResult> {
  const denied = await denyUnless("editContent");
  if (denied) return { ok: false, error: denied.error };

  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the import details.",
    };
  }
  const d = parsed.data;

  // Resolve (or create) the subject and confirm it lines up with the centre.
  let areaId: string | null = null;
  let roleId: string | null = null;
  let activityId: string | null = null;

  if (d.subjectType === "Area") {
    let area = d.subjectId
      ? await db.area.findUnique({ where: { id: d.subjectId } })
      : null;
    if (!area && d.newSubjectName) {
      area = await db.area.create({
        data: { centerId: d.centerId, name: d.newSubjectName },
      });
    }
    if (!area) return { ok: false, error: "Pick an existing area or name a new one." };
    if (area.centerId !== d.centerId) {
      return { ok: false, error: "That area belongs to a different centre." };
    }
    areaId = area.id;
  } else if (d.subjectType === "Role") {
    let role = d.subjectId
      ? await db.role.findUnique({ where: { id: d.subjectId } })
      : null;
    if (!role && d.newSubjectName) {
      role = await db.role.upsert({
        where: { name: d.newSubjectName },
        update: {},
        create: { name: d.newSubjectName },
      });
    }
    if (!role) return { ok: false, error: "Pick an existing role or name a new one." };
    roleId = role.id;
  } else {
    let activity = d.subjectId
      ? await db.activity.findUnique({ where: { id: d.subjectId } })
      : null;
    if (!activity && d.newSubjectName) {
      activity = await db.activity.upsert({
        where: { name: d.newSubjectName },
        update: {},
        create: { name: d.newSubjectName },
      });
    }
    if (!activity) {
      return { ok: false, error: "Pick an existing activity or name a new one." };
    }
    activityId = activity.id;
  }

  const assessmentDate = new Date(d.assessmentDate);
  const nextReviewDate = computeNextReviewDate(
    assessmentDate,
    d.reviewFrequencyMonths,
  );
  const hazards = hazardCreateData(d.hazards);

  // One subject → one assessment. Reuse an existing one if present.
  const existing = await db.riskAssessment.findFirst({
    where:
      d.subjectType === "Area"
        ? { areaId }
        : d.subjectType === "Role"
          ? { roleId }
          : { activityId },
    select: { id: true },
  });

  let assessmentId: string;
  if (existing) {
    await db.$transaction([
      db.hazard.deleteMany({ where: { assessmentId: existing.id } }),
      db.riskAssessment.update({
        where: { id: existing.id },
        data: {
          status: d.status,
          assessmentDate,
          reviewFrequencyMonths: d.reviewFrequencyMonths,
          nextReviewDate,
          hazardSeq: d.hazards.length,
          hazards: { create: hazards },
        },
      }),
    ]);
    assessmentId = existing.id;
  } else {
    const created = await db.riskAssessment.create({
      data: {
        reference: await nextReference(d.centerId),
        centerId: d.centerId,
        subjectType: d.subjectType,
        areaId,
        roleId,
        activityId,
        status: d.status,
        assessmentDate,
        reviewFrequencyMonths: d.reviewFrequencyMonths,
        lastReviewedDate: d.status === "Draft" ? null : assessmentDate,
        nextReviewDate,
        hazardSeq: d.hazards.length,
        hazards: { create: hazards },
      },
    });
    assessmentId = created.id;
  }

  await recordAudit(
    assessmentId,
    await getCurrentUser(),
    "imported",
    `${d.hazards.length} hazard${d.hazards.length === 1 ? "" : "s"} imported`,
  );

  revalidatePath("/assessments");
  revalidatePath("/monitoring");
  revalidatePath("/reference");
  revalidatePath("/");

  return {
    ok: true,
    assessmentId,
    count: d.hazards.length,
    replaced: Boolean(existing),
  };
}
