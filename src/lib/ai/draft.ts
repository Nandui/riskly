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

import {
  generateObject,
  APICallError,
  NoObjectGeneratedError,
  type RepairTextFunction,
} from "ai";
import { z } from "zod";
import {
  LIKELIHOOD_LABELS,
  SEVERITY_LABELS,
  SEVERITY_DESCRIPTIONS,
  clampRating,
} from "@/lib/risk";
import { RISK_CATEGORIES } from "@/lib/constants";
import { normalizePersonsAtRisk, PERSONS_AT_RISK } from "@/lib/persons";

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
  // Optional target number of (new) hazards to draft. Unset lets the model
  // decide — ~10 for a fresh assessment, "as needed" when topping up.
  count?: number | null;
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

// Deliberately lenient: gateway models (DeepSeek especially) often return
// controls as a single string, ratings as strings, an off-list category, or
// omit a field. Accept those shapes here and normalise in code — a strict
// schema just fails the whole draft. Field guidance lives in `.describe`.
const hazardSchema = z.object({
  hazard: z
    .string()
    .min(1)
    .describe(
      "The hazard SOURCE — the thing or condition that can cause harm, written as a noun (e.g. 'Pool water', 'Wet changing-room floor', 'Pool chemicals'). NOT the event (never 'Slips on wet floor').",
    ),
  riskFactor: z
    .string()
    .nullish()
    .describe("The why — the conditions or causes that make the harm likely."),
  personAtRisk: z
    .string()
    .nullish()
    .describe(
      `Who is at risk — one or more of exactly: ${PERSONS_AT_RISK.join(", ")} (comma-separated, no others).`,
    ),
  consequence: z
    .string()
    .nullish()
    .describe(
      "The risk realised — the specific harmful event and its outcome, e.g. 'Drowning — fatal or hypoxic brain injury'.",
    ),
  currentControls: z
    .union([z.array(z.string()), z.string()])
    .nullish()
    .describe(
      "Concrete controls a well-run centre would typically already have in place, as a list of short strings.",
    ),
  likelihood: z
    .coerce.number()
    .catch(2)
    .describe("Residual likelihood 1-5, assuming the listed controls are in place."),
  severity: z.coerce.number().catch(3).describe("Consequence severity 1-5."),
  riskCategory: z
    .string()
    .nullish()
    .describe(
      `The single best-fit risk category — one of: ${CATEGORY_VALUES.join(", ")}.`,
    ),
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

function buildSystemPrompt(want: number | null): string {
  const countRule =
    want != null
      ? `- Produce ${want} hazard${want === 1 ? "" : "s"} — the most significant, each a genuinely distinct risk, ordered most-significant first. Do not pad with near-duplicates.`
      : "- Add as many genuinely new, significant hazards as the assessment is missing. It is fine to return only a few, or an empty list, if it is already comprehensive.";
  return [
    "You are a senior health & safety risk assessor who specialises in leisure, sports and aquatic centres in Ireland. You produce practical, regulation-aware risk assessments consistent with the Safety, Health and Welfare at Work Act 2005 and HSA guidance.",
    "",
    "You will be given the subject of a SINGLE risk assessment — an Area, a Role, or an Activity — at a named leisure centre. Identify its most significant, realistic risks and record each as one entry.",
    "",
    "Use these definitions PRECISELY — they are easily confused:",
    "- HAZARD = the source: the thing or condition with the potential to cause harm, written as a noun. Examples: \"Pool water\", \"Wet changing-room floor\", \"Pool chemicals (chlorine / acid)\", \"Electrical equipment near water\", \"Free weights\". The hazard is NOT the event — do not write \"Slips on a wet floor\"; the hazard is \"Wet floor\".",
    "- RISK FACTOR = the why: the conditions or causes that make harm likely (e.g. non-swimmers and weak swimmers, a momentary lapse in supervision, a sudden medical episode, deep water).",
    "- CONSEQUENCE = the risk realised: the specific harmful event and its outcome (e.g. \"Drowning — fatal or hypoxic brain injury\").",
    `- PERSON AT RISK = who is harmed — choose only from these exact categories: ${PERSONS_AT_RISK.join(", ")} (one or more, comma-separated).`,
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
    countRule,
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

function buildUserPrompt(
  s: DraftSubject,
  avoid: ExistingHazard[],
  want: number | null,
): string {
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

  const avoidList = avoid.filter((h) => h.hazard.trim());
  if (avoidList.length) {
    lines.push(
      "",
      `These ${avoidList.length} hazard(s) are ALREADY covered. Generate hazards that are genuinely DIFFERENT — do NOT repeat, rephrase, or lightly reword any of them, and do NOT copy this list back:`,
      ...avoidList.map((h, i) => {
        const consequence = h.consequence?.trim();
        return `${i + 1}. ${h.hazard.trim()}${consequence ? ` → ${consequence}` : ""}`;
      }),
    );
  }
  lines.push(
    "",
    want != null
      ? `Draft ${want} ${avoidList.length ? "further " : ""}hazard${want === 1 ? "" : "s"} for this ${subject}${avoidList.length ? " that are NOT in the list above" : ""}, most significant first.`
      : `Draft the further significant hazards for this ${subject} that aren't already covered. Return an empty list if nothing significant is missing.`,
  );
  return lines.join("\n");
}

// Controls may arrive as an array, a single string, or a separated list —
// normalise to one control per line.
function toControlLines(
  controls: string[] | string | null | undefined,
): string {
  const arr = Array.isArray(controls)
    ? controls
    : String(controls ?? "").split(/\r?\n|;/);
  return arr
    .map((c) => c.trim())
    .filter(Boolean)
    .join("\n");
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

// Repair the model's raw output before the SDK re-parses it. Gateway models
// (DeepSeek especially) wrap JSON in markdown fences, add a reasoning preamble,
// or — most commonly here — drop the `{ "hazards": [ … ] }` wrapper and return
// a bare array or a comma-separated list of hazard objects. Trim to the JSON
// payload and re-wrap so it matches the expected schema.
const repairJsonText: RepairTextFunction = async ({ text }) => {
  const original = text.trim();
  let t = original;
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1].trim();

  const starts = [t.indexOf("{"), t.indexOf("[")].filter((i) => i !== -1);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start === -1 || end <= start) return null;
  t = t.slice(start, end + 1);

  if (t.startsWith("[")) return `{"hazards":${t}}`;
  if (t.startsWith("{") && !/^\{\s*"hazards"\s*:/.test(t)) {
    return `{"hazards":[${t}]}`;
  }
  return t !== original ? t : null;
};

// Normalise one round's raw output to the hazard form fields.
function mapRawHazards(
  raw: z.infer<typeof outputSchema>["hazards"],
): DraftedHazard[] {
  return raw.map((h) => ({
    hazard: h.hazard.trim(),
    riskFactor: (h.riskFactor ?? "").trim(),
    personAtRisk: normalizePersonsAtRisk(h.personAtRisk),
    consequence: (h.consequence ?? "").trim(),
    currentControls: toControlLines(h.currentControls),
    likelihood: clampRating(h.likelihood),
    severity: clampRating(h.severity),
    riskCategory:
      h.riskCategory && CATEGORY_VALUES.includes(h.riskCategory)
        ? h.riskCategory
        : "Physical",
  }));
}

// Worth retrying: a flaky structured-output miss, rate limiting, or a provider
// 5xx. Auth/quota/unknown-model (401/403/404) are not — fail those fast.
function isTransient(err: unknown): boolean {
  if (NoObjectGeneratedError.isInstance(err)) return true;
  const status = isGatewayError(err)
    ? err.statusCode
    : APICallError.isInstance(err)
      ? err.statusCode
      : undefined;
  return status === 429 || (status !== undefined && status >= 500);
}

// Translate a thrown error into a user-safe AiDraftError.
function toAiDraftError(err: unknown, model: string): AiDraftError {
  if (err instanceof AiDraftError) return err;
  if (NoObjectGeneratedError.isInstance(err)) {
    console.error(
      "[ai-draft] no object generated | finishReason:",
      err.finishReason,
      "| cause:",
      err.cause instanceof Error ? err.cause.message : err.cause,
      "| text:",
      err.text?.slice(0, 600),
    );
    return new AiDraftError(
      err.finishReason === "length"
        ? "The model's response was cut off before it finished. Try again, or switch RISKLY_AI_MODEL to another model."
        : "The model couldn't produce a valid set of hazards — this can be intermittent, so try again. If it persists, switch RISKLY_AI_MODEL to another model.",
    );
  }
  if (isGatewayError(err)) {
    console.error("[ai-draft] gateway error", err.name, err.statusCode);
    return new AiDraftError(aiStatusMessage(err.statusCode, model));
  }
  if (APICallError.isInstance(err)) {
    console.error("[ai-draft] api error", err.statusCode);
    return new AiDraftError(aiStatusMessage(err.statusCode, model));
  }
  console.error("[ai-draft] generateObject failed", err);
  return new AiDraftError("AI drafting failed unexpectedly. Please try again.");
}

// One generation round, retried a couple of times on transient failures.
async function generateRound(
  model: string,
  maxOutputTokens: number,
  subject: DraftSubject,
  avoid: ExistingHazard[],
  want: number | null,
): Promise<DraftedHazard[]> {
  const system = buildSystemPrompt(want);
  const prompt = buildUserPrompt(subject, avoid, want);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: outputSchema,
        system,
        prompt,
        maxOutputTokens,
        experimental_repairText: repairJsonText,
      });
      return mapRawHazards(object.hazards);
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
    }
  }
  throw lastErr;
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
  const explicitCount =
    subject.count && subject.count > 0
      ? Math.min(MAX_HAZARDS, Math.round(subject.count))
      : null;
  // Fresh assessments aim for ~10; a top-up with no count is "as needed".
  const target = explicitCount ?? (topUp ? null : TARGET_HAZARDS);

  const seen = new Set(
    existing.map((h) => dedupKey(h.hazard, h.consequence ?? "")),
  );
  const addNew = (into: DraftedHazard[], from: DraftedHazard[], cap: number) => {
    for (const h of from) {
      if (!h.hazard || into.length >= cap) continue;
      const key = dedupKey(h.hazard, h.consequence);
      if (seen.has(key)) continue;
      seen.add(key);
      into.push(h);
    }
  };

  // "As needed" (top-up with no explicit count): a single round, keep whatever
  // is genuinely new.
  if (target === null) {
    let mapped: DraftedHazard[];
    try {
      mapped = await generateRound(model, maxOutputTokens, subject, existing, null);
    } catch (err) {
      throw toAiDraftError(err, model);
    }
    const out: DraftedHazard[] = [];
    addNew(out, mapped, MAX_HAZARDS);
    return out;
  }

  // Targeted: weaker models tend to echo the "already covered" list back, which
  // dedup then strips — leaving too few. So accumulate over a few rounds,
  // feeding back everything covered so far (existing + collected) and over-
  // asking slightly, until we hit the target or a round adds nothing new.
  const collected: DraftedHazard[] = [];
  const MAX_ROUNDS = 3;
  for (let round = 0; round < MAX_ROUNDS && collected.length < target; round++) {
    const want = Math.min(MAX_HAZARDS, target - collected.length + 2);
    const avoid: ExistingHazard[] = [
      ...existing,
      ...collected.map((h) => ({ hazard: h.hazard, consequence: h.consequence })),
    ];
    let mapped: DraftedHazard[];
    try {
      mapped = await generateRound(model, maxOutputTokens, subject, avoid, want);
    } catch (err) {
      if (collected.length === 0) throw toAiDraftError(err, model);
      break; // keep what we already have rather than failing the whole draft
    }
    const before = collected.length;
    addNew(collected, mapped, target);
    if (collected.length === before) break; // nothing new — genuinely exhausted
  }
  return collected.slice(0, target);
}
