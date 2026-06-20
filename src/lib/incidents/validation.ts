import { z } from "zod";

// Zod schemas for the incidents module. Style matches src/lib/validation.ts:
// ids are `z.string().min(1)`, optional free text is trimmed + capped, enums are
// literal unions. Forms post most fields as strings plus JSON arrays for the
// nested People / Follow-up sections; the actions assemble an object and parse
// it here (same approach as the assessment form's hazards).

const optionalText = (max = 500) => z.string().trim().max(max).optional();
const optionalEmail = z
  .union([z.string().trim().email("Enter a valid email").max(160), z.literal("")])
  .optional();

const dateTimeString = z
  .string()
  .min(1, "Set the date & time")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date & time");

const dateString = z
  .string()
  .min(1, "Set a date")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date");

const incidentTypeEnum = z.enum([
  "Accident",
  "NearMiss",
  "PropertyDamage",
  "ViolenceAggression",
  "HazardousSubstance",
  "FireOrEvacuation",
  "Other",
]);

const severityEnum = z.enum(["Minor", "Significant", "Reportable", "Critical"]);

const partyTypeEnum = z.enum([
  "Staff",
  "Member",
  "Contractor",
  "Visitor",
  "Public",
]);

const treatmentEnum = z.enum([
  "None",
  "FirstAidOnly",
  "GpReferral",
  "HospitalAE",
  "HospitalAdmitted",
]);

const actionStatusEnum = z.enum(["Open", "InProgress", "Complete", "Overdue"]);

// ─── Nested item shapes (also reused for standalone add/update) ──────────────

export const witnessFields = z.object({
  name: z.string().trim().min(1, "Enter a name").max(200),
  roleOrRelation: z.string().trim().min(1, "Enter a role or relationship").max(200),
  contactPhone: optionalText(50),
  contactEmail: optionalEmail,
  statement: z.string().trim().min(1, "Enter the statement").max(5000),
  statementDate: dateString,
});

export const injuredPartyFields = z.object({
  partyType: partyTypeEnum,
  name: z.string().trim().min(1, "Enter a name").max(200),
  contactPhone: optionalText(50),
  contactEmail: optionalEmail,
  injuryNature: z.string().trim().min(1, "Describe the injury").max(500),
  bodyPartAffected: z.string().trim().min(1, "Enter the body part affected").max(200),
  treatment: treatmentEnum,
  hospitalName: optionalText(200),
  lostTime: z.coerce.boolean().default(false),
  lostTimeDays: z.coerce.number().int().min(0).max(3650).optional(),
  additionalNotes: optionalText(2000),
});

export const followUpFields = z.object({
  description: z.string().trim().min(1, "Describe the action").max(1000),
  assignedTo: z.string().trim().min(1, "Assign the action to someone").max(200),
  dueDate: dateString,
});

// ─── Incident ───────────────────────────────────────────────────────────────

// A plain object of field schemas, spread into the concrete incident schemas.
const incidentBase = {
  centerId: z.string().min(1, "Select a centre"),
  type: incidentTypeEnum,
  severity: severityEnum,
  occurredAt: dateTimeString,
  areaId: z.string().min(1, "Select a location"),
  subAreaId: z
    .union([z.string().min(1), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  immediateAction: optionalText(2000),
  // Who the report is attributed to. Defaults server-side to the signed-in user;
  // only admins may set this to someone else.
  reportedById: optionalText(60),
};

export const incidentFullSchema = z.object({
  ...incidentBase,
  description: z.string().trim().min(10, "Add a fuller description (at least 10 characters)").max(5000),
  witnesses: z.array(witnessFields).default([]),
  injuredParties: z.array(injuredPartyFields).default([]),
  followUpActions: z.array(followUpFields).default([]),
});

// Drafts only enforce the Section-1 essentials; the narrative can be short/empty.
export const incidentDraftSchema = z.object({
  ...incidentBase,
  description: optionalText(5000).transform((v) => v ?? ""),
  witnesses: z.array(witnessFields).default([]),
  injuredParties: z.array(injuredPartyFields).default([]),
  followUpActions: z.array(followUpFields).default([]),
});

export const incidentUpdateSchema = z.object({
  ...incidentBase,
  id: z.string().min(1),
  description: z.string().trim().min(10, "Add a fuller description (at least 10 characters)").max(5000),
});

export type IncidentFullInput = z.infer<typeof incidentFullSchema>;
export type IncidentUpdateInput = z.infer<typeof incidentUpdateSchema>;
export type WitnessInput = z.infer<typeof witnessFields>;
export type InjuredPartyInput = z.infer<typeof injuredPartyFields>;
export type FollowUpInput = z.infer<typeof followUpFields>;

// ─── Standalone add / update (from the detail page) ─────────────────────────

export const addWitnessSchema = witnessFields.extend({ incidentId: z.string().min(1) });
export const updateWitnessSchema = witnessFields.extend({ id: z.string().min(1) });

export const addInjuredPartySchema = injuredPartyFields.extend({
  incidentId: z.string().min(1),
});
export const updateInjuredPartySchema = injuredPartyFields.extend({
  id: z.string().min(1),
});

export const addFollowUpActionSchema = followUpFields.extend({
  incidentId: z.string().min(1),
});
export const updateFollowUpActionSchema = followUpFields.extend({
  id: z.string().min(1),
  status: actionStatusEnum,
  notes: optionalText(2000).transform((v) => v ?? ""),
});

export const setActionStatusSchema = z.object({
  id: z.string().min(1),
  status: actionStatusEnum,
});

export const closeIncidentSchema = z.object({
  incidentId: z.string().min(1),
  closureNotes: z.string().trim().min(1, "Add a closing note").max(2000),
});

// Sub-area admin (area uses the shared taxonomySchema in src/lib/validation.ts).
export const subAreaSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  description: optionalText(500),
});
