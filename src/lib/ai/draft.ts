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

// DeepSeek V3.1 via the AI Gateway — capable structured output at low cost.
// Override with any model id enabled on your AI Gateway via RISKLY_AI_MODEL,
// e.g. "google/gemini-2.5-flash".
const DEFAULT_MODEL = "deepseek/deepseek-v3.1";
const TARGET_HAZARDS = 10;
const MAX_HAZARDS = 16;

const CATEGORY_VALUES = RISK_CATEGORIES.map((c) => c.value) as [string, ...string[]];

// A friendly error whose message is safe to surface to the user.
export class AiDraftError extends Error {}

export type DraftSubjectType = "Area" | "Role" | "Activity";

export interface ExistingHazard {
  hazard: string;
  consequence?: string | null;
}

export interface DraftSubject {
  subjectType: DraftSubjectType;
  subjectName: string;
  subjectDescription?: string | null;
  centerName: string;
  hint?: string | null;
  // Overall purpose / scope notes for the whole assessment.
  scope?: string | null;
  // Hazards already recorded on the assessment. When present, the model adds
  // complementary risks instead of starting from scratch — and avoids
  // duplicating these.
  existingHazards?: ExistingHazard[];
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
    .describe(
      "The drafted hazards, most significant first. The same hazard source may appear in multiple entries for distinct risks. May be empty when an existing assessment already covers every significant risk.",
    ),
});

function numberedScale(labels: readonly string[], descriptions?: readonly string[]) {
  return labels
    .map((label, i) =>
      descriptions ? `${i + 1} = ${label} — ${descriptions[i]}` : `${i + 1} = ${label}`,
    )
    .join("\n");
}

function buildSystemPrompt(topUp: boolean): string {
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
    topUp
      ? "- You are ADDING to an existing assessment that already lists some hazards (given below). Draft only NEW, genuinely significant hazards that are NOT already covered. Never restate, rephrase or duplicate an existing entry. Quality over quantity: add as many as are truly missing and no more — returning only a few, or an empty list when the assessment is already comprehensive, is correct and expected."
      : `- Produce at least ${TARGET_HAZARDS} entries (target ${TARGET_HAZARDS}–${TARGET_HAZARDS + 2}), ordered most-significant first. Cover the genuinely important risks — do not pad with trivia or near-duplicates.`,
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
  const subject = s.subjectType.toLowerCase();
  const lines = [
    `Centre: ${s.centerName}`,
    `This risk assessment is for the ${s.subjectType}: "${s.subjectName}"`,
  ];
  if (s.subjectDescription && s.subjectDescription.trim()) {
    lines.push(`${s.subjectType} description: ${s.subjectDescription.trim()}`);
  }
  if (s.scope && s.scope.trim()) {
    lines.push(`Overall purpose / scope of this assessment: ${s.scope.trim()}`);
  }
  if (s.hint && s.hint.trim()) {
    lines.push(`Additional focus from the assessor: ${s.hint.trim()}`);
  }

  const existing = (s.existingHazards ?? []).filter((h) => h.hazard.trim());
  if (existing.length) {
    lines.push(
      "",
      `This assessment ALREADY records the following ${existing.length} hazard(s). Do NOT repeat or rephrase them — only add significant risks for this ${subject} that they do not already cover:`,
      ...existing.map((h, i) => {
        const consequence = h.consequence?.trim();
        return `${i + 1}. ${h.hazard.trim()}${consequence ? ` → ${consequence}` : ""}`;
      }),
      "",
      `Draft the additional hazards. Return an empty list if nothing significant is missing.`,
    );
  } else {
    lines.push("", `Draft the most important hazards for this ${subject}.`);
  }
  return lines.join("\n");
}

// Normalised key for duplicate detection: same hazard source + consequence.
function dedupKey(hazard: string, consequence: string): string {
  return `${hazard} ${consequence}`.toLowerCase().replace(/\s+/g, " ").trim();
}

// String model ids resolve through the Vercel AI Gateway, which reports auth /
// quota / unknown-model problems as a GatewayError (name "Gateway…") — NOT an
// APICallError, so these otherwise slip through to the generic catch. The SDK
// sets `.name` to a stable literal, so match on it without a direct dependency.
function isGatewayError(
  err: unknown,
): err is { name: string; statusCode?: number } {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { name?: unknown }).name === "string" &&
    (err as { name: string }).name.includes("Gateway")
  );
}

// Map an HTTP status from the gateway/provider to an actionable message.
function aiStatusMessage(status: number | undefined, model: string): string {
  if (status === 401)
    return "The AI Gateway rejected the credentials (401) — set a valid AI_GATEWAY_API_KEY, or deploy on Vercel where the gateway authenticates automatically.";
  if (status === 403)
    return "The AI Gateway denied the request (403) — the key or deployment isn't authorised for this provider/model. Check your AI Gateway access and that a provider key (e.g. Google AI Studio) is configured.";
  if (status === 404)
    return `Model "${model}" isn't available on your AI Gateway. Set RISKLY_AI_MODEL to a model you've enabled.`;
  if (status === 429)
    return "The AI Gateway is rate-limited right now. Wait a moment and try again.";
  if (status !== undefined && status >= 500)
    return "The AI provider is unavailable right now. Please try again shortly.";
  return "The AI Gateway couldn't complete the request — check the gateway authentication and that a provider key is configured, then try again.";
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

  const existing = (subject.existingHazards ?? []).filter((h) => h.hazard.trim());
  const topUp = existing.length > 0;

  try {
    const { object } = await generateObject({
      model,
      schema: outputSchema,
      system: buildSystemPrompt(topUp),
      prompt: buildUserPrompt(subject),
      maxOutputTokens,
    });

    const mapped = object.hazards.map((h) => ({
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

    // Belt-and-braces: drop anything that repeats an already-recorded hazard or
    // an earlier entry in this batch, then cap the total.
    const seen = new Set(
      existing.map((h) => dedupKey(h.hazard, h.consequence ?? "")),
    );
    const deduped: DraftedHazard[] = [];
    for (const h of mapped) {
      if (!h.hazard) continue;
      const key = dedupKey(h.hazard, h.consequence);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(h);
      if (deduped.length >= MAX_HAZARDS) break;
    }
    return deduped;
  } catch (err) {
    if (err instanceof AiDraftError) throw err;
    if (NoObjectGeneratedError.isInstance(err)) {
      throw new AiDraftError(
        "The model couldn't produce a valid set of hazards. Try again, or switch RISKLY_AI_MODEL to another model.",
      );
    }
    if (isGatewayError(err)) {
      console.error("[ai-draft] gateway error", err.name, err.statusCode);
      throw new AiDraftError(aiStatusMessage(err.statusCode, model));
    }
    if (APICallError.isInstance(err)) {
      console.error("[ai-draft] api error", err.statusCode);
      throw new AiDraftError(aiStatusMessage(err.statusCode, model));
    }
    console.error("[ai-draft] generateObject failed", err);
    throw new AiDraftError("AI drafting failed unexpectedly. Please try again.");
  }
}
