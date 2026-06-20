// ------------------------------------------------------------------
// LLM workflow that kickstarts a risk assessment: given a subject
// (an Area, Role or Activity) at a leisure centre, the model drafts the most
// important hazards — fully rated on Riskly's own 1-5 likelihood/severity
// scales — which a human then reviews and edits before saving.
//
// Routed through the Vercel AI Gateway (the `ai` SDK with a "creator/model"
// id), so it uses whichever provider keys (Google AI Studio, DeepSeek, …) are
// configured on the team's gateway. Server-only: auth comes from
// AI_GATEWAY_API_KEY or, on a Vercel deployment, the OIDC token automatically.
//
// Reliability notes: we use `generateText` (plain completion) and parse the
// JSON ourselves rather than `generateObject`, because small/open models are
// inconsistent at the provider's structured-output mode — the single biggest
// source of intermittent "no object generated" failures. We tolerate messy
// output (fences, preambles, run-on control strings, a bad item here or there),
// retry transient failures with backoff, and keep the whole call inside a time
// budget so it never runs the serverless function out of time.
// ------------------------------------------------------------------

import { generateText, APICallError } from "ai";
import { z } from "zod";
import {
  LIKELIHOOD_LABELS,
  SEVERITY_LABELS,
  SEVERITY_DESCRIPTIONS,
  clampRating,
} from "@/lib/risk";
import { RISK_CATEGORIES } from "@/lib/constants";
import { normalizePersonsAtRisk, PERSONS_AT_RISK } from "@/lib/persons";

// Default model via the Vercel AI Gateway. Gemini 2.5 Flash is fast, cheap and
// reliable at instruction-following / JSON — far steadier than a small model.
// Override with any model id enabled (and billed) on your gateway via
// RISKLY_AI_MODEL, e.g. "google/gemma-4-26b-a4b-it" or "deepseek/deepseek-v3.1".
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const TARGET_HAZARDS = 10;
const MAX_HAZARDS = 16;

// Reliability tuning. The whole call must finish within the route's
// maxDuration (60s), so everything shares one budget.
const TOTAL_BUDGET_MS = 55_000; // hard ceiling for the entire draftHazards call
const ATTEMPT_TIMEOUT_MS = 30_000; // per individual model call
const MIN_ATTEMPT_MS = 6_000; // don't start a new call without at least this left
const MAX_ATTEMPTS_PER_ROUND = 4;

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

// Deliberately lenient: models often return controls as a single string,
// ratings as strings, an off-list category, or omit a field. Accept those
// shapes and normalise in code; each hazard is parsed on its own, so one bad
// item is dropped rather than failing the whole batch.
const hazardSchema = z.object({
  hazard: z.string().min(1),
  riskFactor: z.string().nullish(),
  personAtRisk: z.string().nullish(),
  consequence: z.string().nullish(),
  currentControls: z.union([z.array(z.string()), z.string()]).nullish(),
  likelihood: z.coerce.number().catch(2),
  severity: z.coerce.number().catch(3),
  riskCategory: z.string().nullish(),
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
    "Rules:",
    countRule,
    "- Every field must be specific to the subject, not generic boilerplate.",
    "- currentControls is an array of separate short strings — one distinct measure per item. Never merge several controls into one comma-joined string.",
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
    "",
    "OUTPUT FORMAT — respond with ONLY a single JSON object, no markdown fences and no commentary, in exactly this shape:",
    '{"hazards":[{"hazard":"Pool water","riskFactor":"Non-swimmers; lapse in supervision","consequence":"Drowning — fatal or hypoxic brain injury","personAtRisk":"Customers, Children","currentControls":["Qualified lifeguards at required ratios","Constant scanning and zoning","Depth markings and signage"],"likelihood":2,"severity":5,"riskCategory":"Physical"}]}',
    "Every hazard object MUST include all eight keys. likelihood and severity are integers 1-5. currentControls is a JSON array of strings. Output nothing except the JSON object.",
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
    "Respond with only the JSON object described in the system message.",
  );
  return lines.join("\n");
}

// Strip a leading bullet glyph, dash or list number from a single control.
function cleanControl(s: string): string {
  return s
    .trim()
    .replace(/^[-*•·▪◦‣⁃–—]+\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

// Split one run-on string into separate controls. Models that ignore the array
// format pack every measure into a single string separated by newlines, "; ",
// inline bullets ("• ", "- ", "* "), numbering ("1. ", "2) "), or just commas.
// Prefer structural delimiters; only fall back to commas when nothing else
// separates the items.
function splitControlBlob(raw: string): string[] {
  let s = raw.trim();
  if (!s) return [];
  // Turn inline bullets / numbering into line breaks first.
  s = s
    .replace(/\s*[•·▪◦‣⁃]\s*/g, "\n")
    .replace(/\s+[-*]\s+/g, "\n")
    .replace(/\s+\d+[.)]\s+/g, "\n");
  let parts = s.split(/\r?\n|;/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    const byComma = s.split(/,\s+/).map((p) => p.trim()).filter(Boolean);
    if (byComma.length >= 2) parts = byComma;
  }
  return parts;
}

// Normalise controls to one per line for the form/report, whatever shape the
// model used. A genuine multi-item array is trusted as-is (a comma inside an
// item belongs to that one control); a single string — or a one-item array
// holding a run-on blob — is split into its individual measures.
function toControlLines(
  controls: string[] | string | null | undefined,
): string {
  let pieces: string[];
  if (Array.isArray(controls) && controls.length >= 2) {
    pieces = controls.flatMap((c) =>
      String(c ?? "")
        .split(/\r?\n|;/)
        .map((p) => p.trim())
        .filter(Boolean),
    );
  } else {
    const single = Array.isArray(controls) ? controls[0] : controls;
    pieces = splitControlBlob(String(single ?? ""));
  }
  return pieces.map(cleanControl).filter(Boolean).join("\n");
}

// Normalised key for duplicate detection: same hazard source + consequence.
function dedupKey(hazard: string, consequence: string): string {
  return `${hazard} ${consequence}`.toLowerCase().replace(/\s+/g, " ").trim();
}

// Map one validated raw hazard to the form fields.
function mapOne(h: z.infer<typeof hazardSchema>): DraftedHazard {
  return {
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
  };
}

// Trim the model's reply down to a JSON payload. Strips markdown fences and any
// prose preamble, and re-wraps a bare array or a single object into the
// expected `{ "hazards": [ … ] }` shape. Returns null if there's no JSON at all.
function repairJson(text: string): string | null {
  let t = (text ?? "").trim();
  if (!t) return null;
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1].trim();
  const starts = [t.indexOf("{"), t.indexOf("[")].filter((i) => i !== -1);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start === -1 || end <= start) return null;
  t = t.slice(start, end + 1);
  if (t.startsWith("[")) return `{"hazards":${t}}`;
  if (!/^\{\s*"hazards"\s*:/.test(t)) return `{"hazards":[${t}]}`;
  return t;
}

function extractHazardArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { hazards?: unknown }).hazards)
  ) {
    return (data as { hazards: unknown[] }).hazards;
  }
  return null;
}

// Parse a model reply into hazards. Tries the repaired payload then the raw
// text; validates each item on its own, dropping malformed ones. Returns:
//   - an array (possibly empty) when a hazards array was found and parsed
//   - null when nothing parseable was found, or every item was malformed
//     (both mean "retry").
function parseHazards(text: string): DraftedHazard[] | null {
  for (const candidate of [repairJson(text), (text ?? "").trim()]) {
    if (!candidate) continue;
    let data: unknown;
    try {
      data = JSON.parse(candidate);
    } catch {
      continue;
    }
    const arr = extractHazardArray(data);
    if (!arr) continue;
    const good: DraftedHazard[] = [];
    for (const item of arr) {
      const parsed = hazardSchema.safeParse(item);
      if (parsed.success) good.push(mapOne(parsed.data));
    }
    // A non-empty array where nothing validated is a malformed response — retry.
    if (arr.length > 0 && good.length === 0) continue;
    return good;
  }
  return null;
}

// String model ids resolve through the Vercel AI Gateway, which reports auth /
// quota / unknown-model problems as a GatewayError (name "Gateway…") — NOT an
// APICallError, so these otherwise slip through. The SDK sets `.name` to a
// stable literal, so match on it without a direct dependency.
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

function statusOf(err: unknown): number | undefined {
  if (isGatewayError(err)) return err.statusCode;
  if (APICallError.isInstance(err)) return err.statusCode;
  return undefined;
}

// Worth another attempt: timeouts, network blips, rate limiting (429), and
// provider 5xx. Auth / quota / unknown-model / bad-request (401/403/404/400)
// are configuration problems — fail those fast.
function isRetryable(err: unknown): boolean {
  if (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  ) {
    return true;
  }
  if (err instanceof TypeError) return true; // e.g. "fetch failed" network error
  const status = statusOf(err);
  if (status === undefined) return true; // unknown runtime/SDK error — try again
  if (status === 408 || status === 409 || status === 429) return true;
  return status >= 500;
}

function errSummary(err: unknown): string {
  if (isGatewayError(err)) return `gateway ${err.name} ${err.statusCode ?? ""}`.trim();
  if (APICallError.isInstance(err)) return `api ${err.statusCode ?? ""}`.trim();
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 200);
  return String(err).slice(0, 200);
}

function backoffMs(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 4000) + Math.floor(Math.random() * 300);
}

async function sleep(ms: number, deadline: number): Promise<void> {
  const capped = Math.max(0, Math.min(ms, deadline - Date.now()));
  if (capped > 0) await new Promise((r) => setTimeout(r, capped));
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

// Translate a thrown error into a user-safe AiDraftError.
function toAiDraftError(err: unknown, model: string): AiDraftError {
  if (err instanceof AiDraftError) return err;
  if (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  ) {
    console.error("[ai-draft] request timed out");
    return new AiDraftError(
      "The model took too long to respond. Please try again, or set RISKLY_AI_MODEL to a faster model.",
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
  if (err instanceof TypeError) {
    console.error("[ai-draft] network error", err.message);
    return new AiDraftError("Couldn't reach the AI provider. Please try again.");
  }
  console.error("[ai-draft] draft failed", err);
  return new AiDraftError("AI drafting failed unexpectedly. Please try again.");
}

// One generation round: call the model and parse hazards, retrying transient
// failures and unparseable replies with backoff until we get a usable result
// or run out of the shared time budget.
async function generateRound(
  model: string,
  maxOutputTokens: number,
  subject: DraftSubject,
  avoid: ExistingHazard[],
  want: number | null,
  deadline: number,
): Promise<DraftedHazard[]> {
  const system = buildSystemPrompt(want);
  const prompt = buildUserPrompt(subject, avoid, want);
  let lastGenError: unknown = null;
  let sawInvalid = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_ROUND; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;

    let text: string;
    try {
      const res = await generateText({
        model,
        system,
        prompt,
        maxOutputTokens,
        temperature: 0.4,
        abortSignal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
      });
      text = res.text ?? "";
      lastGenError = null; // the call itself succeeded
    } catch (err) {
      lastGenError = err;
      if (!isRetryable(err)) throw err;
      console.error(
        `[ai-draft] attempt ${attempt + 1}/${MAX_ATTEMPTS_PER_ROUND} call failed (model=${model}): ${errSummary(err)}`,
      );
      await sleep(backoffMs(attempt), deadline);
      continue;
    }

    const hazards = parseHazards(text);
    // A specific count was asked for but nothing came back — treat as a miss
    // and retry; for "as needed" (want=null) an empty list is a valid answer.
    if (hazards && (want == null || hazards.length > 0)) return hazards;

    sawInvalid = true;
    console.error(
      `[ai-draft] attempt ${attempt + 1}/${MAX_ATTEMPTS_PER_ROUND} no usable hazards (model=${model}, want=${want ?? "auto"}) text[0..200]=${JSON.stringify(text.slice(0, 200))}`,
    );
    await sleep(backoffMs(attempt), deadline);
  }

  // Exhausted. Surface the most informative failure.
  if (lastGenError) throw lastGenError;
  if (sawInvalid) {
    throw new AiDraftError(
      "The model couldn't produce a valid set of hazards — this can be intermittent, so please try again.",
    );
  }
  throw new AiDraftError(
    "The model didn't respond in time. Please try again, or set RISKLY_AI_MODEL to a faster model.",
  );
}

export async function draftHazards(subject: DraftSubject): Promise<DraftedHazard[]> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new AiDraftError(
      "AI drafting isn't configured — set AI_GATEWAY_API_KEY, or deploy on Vercel where the AI Gateway authenticates automatically.",
    );
  }

  const model = process.env.RISKLY_AI_MODEL || DEFAULT_MODEL;
  // Gemini reasons before answering and needs output headroom; other models cap
  // lower, so stay within ~8k to avoid 400s.
  const maxOutputTokens = model.includes("gemini") ? 16000 : 8000;
  // One budget for the whole call (all rounds + retries), comfortably under the
  // route's maxDuration so the function can never time out mid-flight.
  const deadline = Date.now() + TOTAL_BUDGET_MS;

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
      mapped = await generateRound(
        model,
        maxOutputTokens,
        subject,
        existing,
        null,
        deadline,
      );
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
  // asking slightly, until we hit the target, run out of budget, or a round
  // adds nothing new.
  const collected: DraftedHazard[] = [];
  const MAX_ROUNDS = 3;
  for (let round = 0; round < MAX_ROUNDS && collected.length < target; round++) {
    if (deadline - Date.now() < MIN_ATTEMPT_MS) break;
    const want = Math.min(MAX_HAZARDS, target - collected.length + 2);
    const avoid: ExistingHazard[] = [
      ...existing,
      ...collected.map((h) => ({ hazard: h.hazard, consequence: h.consequence })),
    ];
    let mapped: DraftedHazard[];
    try {
      mapped = await generateRound(
        model,
        maxOutputTokens,
        subject,
        avoid,
        want,
        deadline,
      );
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
