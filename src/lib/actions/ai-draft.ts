"use server";

import { db } from "@/lib/db";
import { denyUnless } from "@/lib/auth";
import {
  draftHazards,
  AiDraftError,
  type DraftedHazard,
  type DraftSubjectType,
} from "@/lib/ai/draft";

export interface GenerateHazardsInput {
  centerId: string;
  subjectType: DraftSubjectType;
  subjectId: string;
  hint?: string;
}

export type GenerateHazardsResult =
  | { ok: true; hazards: DraftedHazard[] }
  | { ok: false; error: string };

// Resolve the chosen subject to a human name (+ optional description) for the
// prompt, validating it exists and belongs to the centre.
async function resolveSubjectContext(
  input: GenerateHazardsInput,
): Promise<{ name: string; description: string | null } | { error: string }> {
  if (input.subjectType === "Area") {
    const a = await db.area.findUnique({
      where: { id: input.subjectId },
      select: { name: true, description: true, centerId: true },
    });
    if (!a) return { error: "Selected area not found." };
    if (a.centerId !== input.centerId)
      return { error: "That area belongs to a different centre." };
    return { name: a.name, description: a.description };
  }
  if (input.subjectType === "Role") {
    const r = await db.role.findUnique({
      where: { id: input.subjectId },
      select: { name: true, description: true },
    });
    if (!r) return { error: "Selected role not found." };
    return { name: r.name, description: r.description };
  }
  const ac = await db.activity.findUnique({
    where: { id: input.subjectId },
    select: { name: true, description: true },
  });
  if (!ac) return { error: "Selected activity not found." };
  return { name: ac.name, description: ac.description };
}

export async function generateAssessmentHazards(
  input: GenerateHazardsInput,
): Promise<GenerateHazardsResult> {
  const denied = await denyUnless("editContent");
  if (denied) return { ok: false, error: denied.error ?? "Not allowed." };

  if (!input.centerId || !input.subjectId) {
    return { ok: false, error: "Choose a centre and a subject first." };
  }

  const center = await db.center.findUnique({
    where: { id: input.centerId },
    select: { name: true },
  });
  if (!center) return { ok: false, error: "Centre not found." };

  const subject = await resolveSubjectContext(input);
  if ("error" in subject) return { ok: false, error: subject.error };

  try {
    const hazards = await draftHazards({
      subjectType: input.subjectType,
      subjectName: subject.name,
      subjectDescription: subject.description,
      centerName: center.name,
      hint: input.hint?.trim() || null,
    });
    return { ok: true, hazards };
  } catch (err) {
    if (err instanceof AiDraftError) return { ok: false, error: err.message };
    console.error("[ai-draft] generation failed", err);
    return { ok: false, error: "AI drafting failed unexpectedly. Please try again." };
  }
}
