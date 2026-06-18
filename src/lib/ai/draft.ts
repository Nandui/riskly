// ------------------------------------------------------------------
// LLM workflow that kickstarts a risk assessment: given a subject
// (an Area, Role or Activity) at a leisure centre, the model drafts the most
// important hazards — fully rated on Riskly's own 1-5 likelihood/severity
// scales — which a human then reviews and edits before saving.
//
// Routed through the Vercel AI Gateway (the `ai` SDK with a "creator/model"
// id), so it uses whichever provider keys (DeepSeek, Google AI Studio, …) are
// configured on the team's gateway. Server-only: auth comes from
// AI_GATEWAY_API_KEY or, on a Vercel deployment, the OIDC token automatically.
// ------------------------------------------------------------------

import { generateObject, APICallError, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import {
  LIKELIHOOD_LABELS,
  SEVERITY_LABELS,
  SEVERITY_DESCRIPTIONS,
  clampRating,
} from "@/lib/risk";
import { RISK_CATEGORIES } from "@/lib/constants";

// Fast, cheap, reliable structured output, and available on Google AI Studio.
// Override with any model id from your AI Gateway via RISKLY_AI_MODEL, e.g.
// "deepseek/deepseek-v3.1" or "google/gemini-3.5-flash".
const DEFAULT_MODEL = "google/gemini-2.5-flash";
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

const hazardSchema = z.object({
  hazard: z
    .string()
    .min(1)
    .max(300)
    .describe(
      "The hazard SOURCE — the thing or condition that can cause harm, written as a noun (e.g. 'Pool water', 'Wet changing-room floor', 'Pool chemicals'). NOT the event (never 'Slips on wet floor').",
    ),
  riskFactor: z
    .string()
    .max(800)
    .describe("The why — the conditions or causes that make the harm likely."),
  personAtRisk: z
    .string()
    .max(300)
    .describe("Who is at risk, e.g. 'Customers, Children, Staff'."),
  consequence: z
    .string()
    .max(800)
    .describe(
      "The risk realised — the specific harmful event and its outcome, e.g. 'Drowning — fatal or hypoxic brain injury'.",
    ),
  currentControls: z
    .array(z.string())
    .describe(
      "Concrete controls a well-run centre would typically already have in place.",
    ),
  likelihood: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("Residual likelihood 1-5, assuming the listed controls are in place."),
  severity: z.number().int().min(1).max(5).describe("Consequence severity 1-5."),
  riskCategory: z.enum(CATEGORY_VALUES).describe("The single best-fit risk category."),
});

const outputSchema = z.object({
  hazards: z
    .array(hazardSchema)
    .min(1)
    .describe(
      `The ${TARGET_HAZARDS}+ most important risks for the subject, most significant first. The same hazard source may appear in multiple entries for distinct risks.`,
    ),
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
    "You will be given the subject of a SINGLE risk assessment — an Area, a Role, or an Activity — at a named leisure centre. Identify its most significant, realistic risks and record each as one entry.",
    "",
    "Use these definitions PRECISELY — they are easily confused:",
    "- HAZARD = the source: the thing or condition with the potential to cause harm, written as a noun. Examples: \"Pool water\", \"Wet changing-room floor\", \"Pool chemicals (chlorine / acid)\", \"Electrical equipment near water\", \"Free weights\". The hazard is NOT the event — do not write \"Slips on a wet floor\"; the hazard is \"Wet floor\".",
    "- RISK FACTOR = the why: the conditions or causes that make harm likely (e.g. non-swimmers and weak swimmers, a momentary lapse in supervision, a sudden medical episode, deep water).",
    "- CONSEQUENCE = the risk realised: the specific harmful event and its outcome (e.g. \"Drowning — fatal or hypoxic brain injury\").",
    "- PERSON AT RISK = who is harmed (e.g. Staff, Customers, Children, Contractors, Members of the public).",
    "- CURRENT CONTROLS = the concrete measures a well-run centre would typically already have in place.",
    "",
    "The SAME hazard source can appear in more than one entry when it presents genuinely distinct significant risks — e.g. \"Pool water\" → drowning, and \"Pool water\" → shallow-end impact / diving injury. Cover the real distinct risks rather than padding with many superficial hazard sources.",
    "",
    "Worked example (a swimming pool):",
    "- hazard: \"Pool water\"",
    "- riskFactor: \"Non-swimmers and weak swimmers; momentary lapse in lifeguard supervision; overcrowding\"",
    "- consequence: \"Drowning or near-drowning — fatal or serious hypoxic brain injury\"",
    "- personAtRisk: \"Customers, Children\"",
    "- currentControls: [\"Qualified lifeguards on poolside at the required ratios\", \"Constant scanning and zoning\", \"Depth markings and signage\", \"Rescue equipment and emergency procedures in place\"]",
    "",
    "Rules:",
    `- Produce at least ${TARGET_HAZARDS} entries (target ${TARGET_HAZARDS}–${TARGET_HAZARDS + 2}), ordered most-significant first. Cover the genuinely important risks — do not pad with trivia or near-duplicates.`,
    "- Every field must be specific to the subject, not generic boilerplate.",
    "- Rate Likelihood (1–5) and Severity (1–5) realistically, ASSUMING the current controls you listed are already in place (i.e. the residual risk). Use these scales exactly:",
    "",
    "  Likelihood:",
    numberedScale(LIKELIHOOD_LABELS),
    "",
    "  Severity (consequence):",
    numberedScale(SEVERITY_LABELS, SEVERITY_DESCRIPTIONS),
    "",
    `- Choose a riskCategory for each hazard from exactly: ${CATEGORY_VALUES.join(", ")}.`,
    "- Do NOT invent site-specific facts (specific equipment models, named staff, exact dimensions, real incident history). Keep controls standard best-practice that a human can tailor.",
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

export async function draftHazards(subject: DraftSubject): Promise<DraftedHazard[]> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new AiDraftError(
      "AI drafting isn't configured — set AI_GATEWAY_API_KEY, or deploy on Vercel where the AI Gateway authenticates automatically.",
    );
  }

  const model = process.env.RISKLY_AI_MODEL || DEFAULT_MODEL;
  // Gemini models reason before answering and can eat the output budget, so
  // give Google models headroom; DeepSeek/others cap lower, so stay within ~8k.
  const maxOutputTokens = model.startsWith("google/") ? 16000 : 8000;

  try {
    const { object } = await generateObject({
      model,
      schema: outputSchema,
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(subject),
      maxOutputTokens,
    });

    return object.hazards.slice(0, MAX_HAZARDS).map((h) => ({
      hazard: h.hazard.trim(),
      riskFactor: h.riskFactor.trim(),
      personAtRisk: h.personAtRisk.trim(),
      consequence: h.consequence.trim(),
      currentControls: h.currentControls
        .map((c) => c.trim())
        .filter(Boolean)
        .join("\n"),
      likelihood: clampRating(h.likelihood),
      severity: clampRating(h.severity),
      riskCategory: CATEGORY_VALUES.includes(h.riskCategory) ? h.riskCategory : "Physical",
    }));
  } catch (err) {
    if (err instanceof AiDraftError) throw err;
    if (NoObjectGeneratedError.isInstance(err)) {
      throw new AiDraftError(
        "The model couldn't produce a valid set of hazards. Try again, or switch RISKLY_AI_MODEL to another model.",
      );
    }
    if (APICallError.isInstance(err)) {
      const status = err.statusCode;
      if (status === 401 || status === 403) {
        throw new AiDraftError(
          "The AI Gateway rejected the request — check the gateway auth and that the provider key is configured.",
        );
      }
      if (status === 404) {
        throw new AiDraftError(
          `Model "${model}" isn't available on your AI Gateway. Set RISKLY_AI_MODEL to a model you've enabled.`,
        );
      }
      throw new AiDraftError("The AI service is unavailable right now. Please try again.");
    }
    console.error("[ai-draft] generateObject failed", err);
    throw new AiDraftError("AI drafting failed unexpectedly. Please try again.");
  }
}
