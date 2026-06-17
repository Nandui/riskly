import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional();
const optionalEmail = z
  .union([z.string().trim().email("Enter a valid email").max(160), z.literal("")])
  .optional();

export const centerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  address: optionalText(300),
  contactName: optionalText(120),
  contactEmail: optionalEmail,
  phone: optionalText(50),
  notes: optionalText(2000),
});
export type CenterInput = z.infer<typeof centerSchema>;

export const areaSchema = z.object({
  centerId: z.string().min(1, "Centre is required"),
  name: z.string().trim().min(2, "Name is required").max(120),
  description: optionalText(500),
});
export type AreaInput = z.infer<typeof areaSchema>;

export const taxonomySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  description: optionalText(500),
});
export type TaxonomyInput = z.infer<typeof taxonomySchema>;

export const hazardSchema = z.object({
  id: z.string().optional(),
  hazardDescription: z.string().trim().min(2, "Describe the hazard").max(500),
  whoAtRisk: optionalText(500),
  existingControls: optionalText(2000),
  initialLikelihood: z.coerce.number().int().min(1).max(5),
  initialSeverity: z.coerce.number().int().min(1).max(5),
  additionalControls: optionalText(2000),
  residualLikelihood: z.coerce.number().int().min(1).max(5),
  residualSeverity: z.coerce.number().int().min(1).max(5),
  actionOwnerName: optionalText(120),
  actionDueDate: z.union([z.string(), z.literal("")]).optional(),
  actionStatus: z.enum(["NA", "Open", "InProgress", "Done"]).default("NA"),
});
export type HazardInput = z.infer<typeof hazardSchema>;

export const assessmentSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  description: optionalText(2000),
  centerId: z.string().min(1, "Select a centre"),
  areaId: z.string().min(1, "Select an area"),
  roleId: z.union([z.string(), z.literal("")]).optional(),
  activityId: z.union([z.string(), z.literal("")]).optional(),
  status: z
    .enum(["Draft", "Active", "UnderReview", "Archived"])
    .default("Draft"),
  assessorName: optionalText(120),
  approvedByName: optionalText(120),
  assessmentDate: z.string().min(1, "Set an assessment date"),
  reviewFrequencyMonths: z.coerce.number().int().min(1).max(60),
  hazards: z.array(hazardSchema).default([]),
});
export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const reviewLogSchema = z.object({
  assessmentId: z.string().min(1),
  reviewedDate: z.string().min(1, "Set the review date"),
  reviewerName: optionalText(120),
  outcome: z.enum(["NoChanges", "Updated", "Escalated"]).default("NoChanges"),
  notes: optionalText(2000),
  newStatus: z
    .union([
      z.enum(["Draft", "Active", "UnderReview", "Archived"]),
      z.literal(""),
    ])
    .optional(),
});
export type ReviewLogInput = z.infer<typeof reviewLogSchema>;
