// ------------------------------------------------------------------
// LLM workflow that kickstarts a risk assessment: given a subject
// (an Area, Role or Activity) at a leisure centre, Claude drafts the most
// important hazards — fully rated on Riskly's own 1-5 likelihood/severity
// scales — which a human then reviews and edits before saving.
//
// Server-only: ANTHROPIC_API_KEY is read here and never reaches the client.
// ------------------------------------------------------------------

import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { z } from "zod";
import { LIKELIHOOD_LABELS, SEVERITY_LABELS, SEVERITY_DESCRIPTIONS } from "@/lib/risk";
import { RISK_CATEGORIES } from "@/lib/constants";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const TARGET_HAZARDS = 10;
const MAX_HAZARDS = 16;

const CATEGORY_VALUES = RISK_CATEGORIES.map((c) => c.value) as [string, ...string[]];

// A friendly error whose message is safe to surface to the user.
export class AiDraftError extends Error {}

export type DraftSubjectType = "Area" | "Role" | "Activity";

export interface DraftSubject {
  subjectType: DraftSubjectType;
  subjectName: string;
  subjectDescription?: string | null;
  centerName: string;
  hint?: string | null;
}

// The shape we hand back — already aligned to the hazard form fields.
export interface DraftedHazard {
  hazard: string;
  riskFactor: string;
  personAtRisk: string;
  consequence: string;
  currentControls: string; // newline-joined, one control per line
  likelihood: number;
  severity: number;
  riskCategory: string;
}

// What we accept back from the model (lenient — clamp/normalise after).
const aiHazardSchema = z.object({
  hazard: z.string().trim().min(2).max(300),
  riskFactor: z.string().trim().max(800).optional().default(""),
  personAtRisk: z.string().trim().max(300).optional().default(""),
  consequence: z.string().trim().max(800).optional().default(""),
  currentControls: z.array(z.string().trim().min(1)).optional().default([]),
  likelihood: z.coerce.number().int().min(1).max(5),
  severity: z.coerce.number().int().min(1).max(5),
  riskCategory: z.enum(CATEGORY_VALUES).catch("Physical"),
});
const aiOutputSchema = z.object({
  hazards: z.array(aiHazardSchema).min(1).max(MAX_HAZARDS),
});

function numberedScale(labels: readonly string[], descriptions?: readonly string[]) {
  return labels
    .map((label, i) =>
      descriptions ? `${i + 1} = ${label} — ${descriptions[i]}` : `${i + 1} = ${label}`,
    )
    .join("\n");
}

function buildSystemPrompt(): string {
  return [
    "You are a senior health & safety risk assessor who specialises in leisure, sports and aquatic centres in Ireland. You produce practical, regulation-aware risk assessments consistent with the Safety, Health and Welfare at Work Act 2005 and HSA guidance.",
    "",
    "You will be given the subject of a SINGLE risk assessment — an Area, a Role, or an Activity — at a named leisure centre. Identify the most significant, realistic hazards for that subject and record them with the record_hazards tool.",
    "",
    "Rules:",
    `- Produce at least ${TARGET_HAZARDS} hazards (target ${TARGET_HAZARDS}–${TARGET_HAZARDS + 2}), ordered most-significant first. Cover the genuinely important risks — do not pad with trivia or near-duplicates.`,
    "- Each hazard must be specific to the subject, not generic boilerplate.",
    "- For each hazard provide: a short hazard title; the risk factor (what causes the harm); who is at risk (e.g. Staff, Customers, Children, Contractors, Members of the public); the consequence (the realistic injury or outcome); and the current controls a well-run centre would typically already have in place, as a list of concrete measures.",
    "- Rate Likelihood (1–5) and Severity (1–5) realistically, ASSUMING the typical current controls you listed are already in place (i.e. the residual risk). Use these scales exactly:",
    "",
    "  Likelihood:",
    numberedScale(LIKELIHOOD_LABELS),
    "",
    "  Severity (consequence):",
    numberedScale(SEVERITY_LABELS, SEVERITY_DESCRIPTIONS),
    "",
    `- Choose a riskCategory for each hazard from exactly: ${CATEGORY_VALUES.join(", ")}.`,
    "- Do NOT invent site-specific facts (specific equipment models, named staff, exact dimensions, real incident history). Keep controls standard best-practice that a human can tailor.",
    "- Output ONLY through the record_hazards tool — no prose.",
  ].join("\n");
}

function buildUserPrompt(s: DraftSubject): string {
  const lines = [
    `Centre: ${s.centerName}`,
    `This risk assessment is for the ${s.subjectType}: "${s.subjectName}"`,
  ];
  if (s.subjectDescription && s.subjectDescription.trim()) {
    lines.push(`${s.subjectType} description: ${s.subjectDescription.trim()}`);
  }
  if (s.hint && s.hint.trim()) {
    lines.push(`Additional focus from the assessor: ${s.hint.trim()}`);
  }
  lines.push("", `Draft the most important hazards for this ${s.subjectType.toLowerCase()}.`);
  return lines.join("\n");
}

const HAZARD_TOOL: Anthropic.Tool = {
  name: "record_hazards",
  description: "Record the drafted hazards for this risk assessment.",
  input_schema: {
    type: "object",
    properties: {
      hazards: {
        type: "array",
        minItems: TARGET_HAZARDS,
        maxItems: MAX_HAZARDS,
        items: {
          type: "object",
          properties: {
            hazard: { type: "string", description: "Short hazard title, e.g. 'Slips on wet poolside surround'." },
            riskFactor: { type: "string", description: "What causes the harm." },
            personAtRisk: { type: "string", description: "Who is at risk, e.g. 'Customers, Children'." },
            consequence: { type: "string", description: "The realistic injury or outcome." },
            currentControls: {
              type: "array",
              items: { type: "string" },
              description: "Concrete controls a well-run centre would typically already have in place.",
            },
            likelihood: { type: "integer", minimum: 1, maximum: 5, description: "Residual likelihood 1-5." },
            severity: { type: "integer", minimum: 1, maximum: 5, description: "Consequence severity 1-5." },
            riskCategory: { type: "string", enum: [...CATEGORY_VALUES] },
          },
          required: [
            "hazard",
            "riskFactor",
            "personAtRisk",
            "consequence",
            "currentControls",
            "likelihood",
            "severity",
            "riskCategory",
          ],
        },
      },
    },
    required: ["hazards"],
  },
};

export async function draftHazards(subject: DraftSubject): Promise<DraftedHazard[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiDraftError(
      "AI drafting isn't configured yet — set ANTHROPIC_API_KEY in the environment.",
    );
  }
  const model = process.env.RISKLY_AI_MODEL || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  let res: Anthropic.Message;
  try {
    res = await client.messages.create({
      model,
      max_tokens: 8000,
      system: buildSystemPrompt(),
      tools: [HAZARD_TOOL],
      tool_choice: { type: "tool", name: "record_hazards" },
      messages: [{ role: "user", content: buildUserPrompt(subject) }],
    });
  } catch (err) {
    if (err instanceof APIError) {
      throw new AiDraftError(
        err.status === 401
          ? "The AI API key was rejected. Check ANTHROPIC_API_KEY."
          : "The AI service is unavailable right now. Please try again.",
      );
    }
    throw err;
  }

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new AiDraftError("The model didn't return any hazards. Please try again.");
  }

  const parsed = aiOutputSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new AiDraftError("The model returned hazards in an unexpected shape. Please try again.");
  }

  return parsed.data.hazards.map((h) => ({
    hazard: h.hazard,
    riskFactor: h.riskFactor,
    personAtRisk: h.personAtRisk,
    consequence: h.consequence,
    currentControls: h.currentControls.join("\n"),
    likelihood: h.likelihood,
    severity: h.severity,
    riskCategory: h.riskCategory,
  }));
}
