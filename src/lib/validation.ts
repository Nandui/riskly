import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional();
const optionalEmail = z
  .union([z.string().trim().email("Enter a valid email").max(160), z.literal("")])
  .optional();

export const centerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  siteCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Use a 2-letter site code (e.g. BT)"),
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
  hazard: z.string().trim().min(2, "Describe the hazard").max(300),
  riskFactor: optionalText(500),
  personAtRisk: optionalText(300),
  consequence: optionalText(500),
  currentControls: optionalText(2000),
  likelihood: z.coerce.number().int().min(1).max(5),
  severity: z.coerce.number().int().min(1).max(5),
  riskCategory: z
    .enum([
      "Physical",
      "Chemical",
      "Biological",
      "Ergonomic",
      "Psychosocial",
      "Environmental",
    ])
    .default("Physical"),
});
export type HazardInput = z.infer<typeof hazardSchema>;

export const assessmentSchema = z.object({
  description: optionalText(2000),
  centerId: z.string().min(1, "Select a centre"),
  subjectType: z.enum(["Area", "Role", "Activity"]).default("Area"),
  subjectId: z.string().min(1, "Select the subject"),
  status: z
    .enum(["Draft", "Active", "UnderReview", "Archived"])
    .default("Draft"),
  assessorName: optionalText(120),
  assessmentDate: z.string().min(1, "Set an assessment date"),
  reviewFrequencyMonths: z.coerce.number().int().min(1).max(60),
  hazards: z.array(hazardSchema).default([]),
  ownerId: optionalText(60),
  departmentId: optionalText(60),
});
export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const reviewRequestSchema = z.object({
  assessmentId: z.string().min(1),
  notes: z
    .string()
    .trim()
    .min(3, "Add a short note explaining the request.")
    .max(2000),
});
export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;

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

// ---- Authentication & users ----

const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(100, "That password is too long");

export const firstAdminSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(160),
  password: passwordField,
});
export type FirstAdminInput = z.infer<typeof firstAdminSchema>;

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  email: z.string().trim().email("Enter a valid email").max(160),
  role: z.enum(["Viewer", "Contributor", "Reviewer", "Assessor", "Admin"]),
  password: passwordField,
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: passwordField,
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const passwordResetSchema = z.object({
  userId: z.string().min(1),
  password: passwordField,
});
