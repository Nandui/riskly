"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  UploadCloud,
  FileSpreadsheet,
  TriangleAlert,
  Download,
  ArrowRight,
} from "lucide-react";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { riskScore, bandMeta } from "@/lib/risk";
import {
  RISK_CATEGORIES,
  ASSESSMENT_STATUSES,
  REVIEW_FREQUENCY_OPTIONS,
  SUBJECT_TYPES,
  type RiskCategory,
} from "@/lib/constants";
import { importAssessment } from "@/lib/actions/import";
import type { ImportOptions } from "@/lib/data/library";
import { cn } from "@/lib/utils";

type SubjectType = "Area" | "Role" | "Activity";
type Status = "Draft" | "Active" | "UnderReview" | "Archived";

interface ParsedHazard {
  hazard: string;
  riskFactor: string;
  personAtRisk: string;
  consequence: string;
  currentControls: string;
  likelihood: number;
  severity: number;
  riskCategory: RiskCategory;
}

interface ParseResult {
  hazards: ParsedHazard[];
  warnings: string[];
  totalRows: number;
}

const VALID_CATEGORIES = RISK_CATEGORIES.map((c) => c.value);

const ALIASES = {
  hazard: ["hazard", "name"],
  riskFactor: ["risk factor", "riskfactor", "cause"],
  personAtRisk: [
    "person at risk",
    "persons at risk",
    "people at risk",
    "person(s) at risk",
    "who is at risk",
  ],
  consequence: ["consequence", "consequences", "potential consequence"],
  currentControls: [
    "current controls",
    "existing controls",
    "controls",
    "control measures",
  ],
  likelihood: ["likelihood rating", "likelihood", "likelihood (l)", "l"],
  severity: [
    "consequence severity",
    "severity",
    "consequence rating",
    "severity rating",
    "s",
  ],
  riskCategory: ["risk category", "category", "hazard category"],
} as const;

function normHeader(h: string) {
  return h.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseRating(v: string): number | null {
  const m = (v ?? "").match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(1, n));
}

function matchCategory(v: string): RiskCategory | null {
  const t = (v ?? "").trim().toLowerCase();
  if (!t) return null;
  return VALID_CATEGORIES.find((c) => c.toLowerCase() === t) ?? null;
}

function parseCsv(text: string): ParseResult {
  const out: ParseResult = { hazards: [], warnings: [], totalRows: 0 };
  if (!text.trim()) return out;

  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const fields = res.meta.fields ?? [];
  const normMap: Record<string, string> = {};
  for (const f of fields) normMap[normHeader(f)] = f;

  const get = (row: Record<string, string>, aliases: readonly string[]) => {
    for (const a of aliases) {
      const key = normMap[a];
      if (key !== undefined && row[key] != null) return String(row[key]).trim();
    }
    return "";
  };

  if (!ALIASES.hazard.some((a) => normMap[a] !== undefined)) {
    out.warnings.push(
      'Couldn’t find a "Hazard" column — make sure the file has a header row.',
    );
  }

  const rows = res.data ?? [];
  out.totalRows = rows.length;
  let skipped = 0;
  let defaulted = 0;
  const unknownCats = new Set<string>();

  for (const row of rows) {
    const hazard = get(row, ALIASES.hazard);
    if (!hazard) {
      skipped++;
      continue;
    }
    let likelihood = parseRating(get(row, ALIASES.likelihood));
    let severity = parseRating(get(row, ALIASES.severity));
    if (likelihood == null) {
      likelihood = 1;
      defaulted++;
    }
    if (severity == null) {
      severity = 1;
      defaulted++;
    }
    const catRaw = get(row, ALIASES.riskCategory);
    let riskCategory = matchCategory(catRaw);
    if (!riskCategory) {
      if (catRaw) unknownCats.add(catRaw);
      riskCategory = "Physical";
    }
    out.hazards.push({
      hazard,
      riskFactor: get(row, ALIASES.riskFactor),
      personAtRisk: get(row, ALIASES.personAtRisk),
      consequence: get(row, ALIASES.consequence),
      currentControls: get(row, ALIASES.currentControls),
      likelihood,
      severity,
      riskCategory,
    });
  }

  if (skipped > 0)
    out.warnings.push(`${skipped} row(s) had no hazard name and were skipped.`);
  if (defaulted > 0)
    out.warnings.push(`${defaulted} missing/blank rating(s) defaulted to 1.`);
  if (unknownCats.size > 0)
    out.warnings.push(
      `Unrecognised categor${unknownCats.size > 1 ? "ies" : "y"} (${[...unknownCats].join(", ")}) set to Physical.`,
    );

  return out;
}

function downloadTemplate() {
  const csv = Papa.unparse([
    [
      "Hazard",
      "Risk Factor",
      "Person at Risk",
      "Consequence",
      "Current Controls",
      "Likelihood Rating",
      "Consequence Severity",
      "Risk Category",
    ],
    [
      "Wet changing-room floor",
      "Slip on wet surface",
      "Customers / Visitors",
      "Sprains or fractures",
      "Anti-slip flooring\nRegular mopping\nWarning signage",
      "2",
      "3",
      "Physical",
    ],
  ]);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "riskly-hazards-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function AssessmentImporter({ options }: { options: ImportOptions }) {
  const router = useRouter();
  const [centerId, setCenterId] = useState(options.centers[0]?.id ?? "");
  const [subjectType, setSubjectType] = useState<SubjectType>("Area");
  const [subjectId, setSubjectId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [status, setStatus] = useState<Status>("Active");
  const [assessmentDate, setAssessmentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reviewFrequencyMonths, setReviewFrequencyMonths] = useState("12");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseCsv(csvText), [csvText]);

  const subjectChoices =
    subjectType === "Area"
      ? options.areas.filter((a) => a.centerId === centerId)
      : subjectType === "Role"
        ? options.roles
        : options.activities;

  const isNew = subjectId === "__new__";
  const subjectReady = isNew
    ? newSubjectName.trim().length > 1
    : subjectId.length > 0;
  const ready =
    !!centerId && subjectReady && parsed.hazards.length > 0 && !submitting;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsvText(await file.text());
  }

  async function onImport() {
    setSubmitting(true);
    setError(null);
    const res = await importAssessment({
      centerId,
      subjectType,
      subjectId: isNew ? undefined : subjectId,
      newSubjectName: isNew ? newSubjectName.trim() : undefined,
      status,
      assessmentDate,
      reviewFrequencyMonths: Number(reviewFrequencyMonths),
      hazards: parsed.hazards,
    });
    if (res.ok && res.assessmentId) {
      router.push(`/assessments/${res.assessmentId}`);
    } else {
      setError(res.error ?? "Import failed.");
      setSubmitting(false);
    }
  }

  const cardClass =
    "rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs";

  return (
    <div className="space-y-5">
      {/* 1. Destination */}
      <div className={cardClass}>
        <h2 className="text-sm font-semibold text-ink">
          1. Where do these hazards belong?
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Centre" htmlFor="imp-center">
            <Select
              id="imp-center"
              value={centerId}
              onChange={(e) => {
                setCenterId(e.target.value);
                setSubjectId("");
              }}
            >
              {options.centers.length === 0 && <option value="">No centres yet</option>}
              {options.centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="This assessment is for a…" htmlFor="imp-type">
            <Select
              id="imp-type"
              value={subjectType}
              onChange={(e) => {
                setSubjectType(e.target.value as SubjectType);
                setSubjectId("");
              }}
            >
              {SUBJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={subjectType}
            htmlFor="imp-subject"
            className={isNew ? undefined : "sm:col-span-2"}
          >
            <Select
              id="imp-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">Select {subjectType.toLowerCase()}…</option>
              {subjectChoices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="__new__">➕ New {subjectType.toLowerCase()}…</option>
            </Select>
          </Field>

          {isNew && (
            <Field label={`New ${subjectType.toLowerCase()} name`} htmlFor="imp-newname">
              <Input
                id="imp-newname"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder={subjectType === "Area" ? "e.g. 25 metre pool" : ""}
              />
            </Field>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Status" htmlFor="imp-status">
            <Select
              id="imp-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              {ASSESSMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assessment date" htmlFor="imp-date">
            <Input
              id="imp-date"
              type="date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
            />
          </Field>
          <Field label="Review frequency" htmlFor="imp-freq">
            <Select
              id="imp-freq"
              value={reviewFrequencyMonths}
              onChange={(e) => setReviewFrequencyMonths(e.target.value)}
            >
              {REVIEW_FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {/* 2. File */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">2. Upload the CSV</h2>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-strong hover:underline"
          >
            <Download className="size-3.5" /> Download template
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          In Notion, open the area’s table → <strong>•••</strong> →{" "}
          <strong>Export</strong> → <em>Markdown &amp; CSV</em>, then upload the
          CSV here. Columns are matched by name (Hazard, Risk Factor, Person at
          Risk, Consequence, Current Controls, Likelihood, Consequence Severity,
          Risk Category).
        </p>

        <label
          htmlFor="imp-file"
          className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center transition-colors hover:border-brand"
        >
          <UploadCloud className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium text-ink">
            {fileName ?? "Choose a CSV file"}
          </span>
          <span className="text-xs text-muted-foreground">or paste the rows below</span>
          <input
            id="imp-file"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFile}
          />
        </label>

        <textarea
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setFileName(null);
          }}
          rows={4}
          placeholder="…or paste CSV content here"
          className="scroll-slim mt-3 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono text-xs text-ink shadow-xs focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none"
        />
      </div>

      {/* 3. Preview */}
      {csvText.trim() && (
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-ink">
            3. Preview —{" "}
            <span className="text-brand-strong">
              {parsed.hazards.length} hazard{parsed.hazards.length === 1 ? "" : "s"}
            </span>{" "}
            found
          </h2>

          {parsed.warnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {parsed.warnings.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-amber-700"
                >
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}

          {parsed.hazards.length > 0 && (
            <div className="scroll-slim mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Hazard</th>
                    <th className="px-2 py-1.5 text-center font-medium">L</th>
                    <th className="px-2 py-1.5 text-center font-medium">S</th>
                    <th className="px-2 py-1.5 text-center font-medium">Overall</th>
                    <th className="px-2 py-1.5 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.hazards.slice(0, 8).map((h, i) => {
                    const score = riskScore(h.likelihood, h.severity);
                    const band = bandMeta(score);
                    return (
                      <tr key={i} className="border-t border-line">
                        <td className="max-w-[18rem] truncate py-1.5 pr-3 text-ink">
                          {h.hazard}
                        </td>
                        <td className="px-2 py-1.5 text-center text-muted-foreground">
                          {h.likelihood}
                        </td>
                        <td className="px-2 py-1.5 text-center text-muted-foreground">
                          {h.severity}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                              band.badge,
                            )}
                          >
                            {score}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{h.riskCategory}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {parsed.hazards.length > 8 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  …and {parsed.hazards.length - 8} more.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-critical-line bg-critical-bg px-3 py-2 text-sm font-medium text-critical">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={onImport} disabled={!ready}>
              {submitting ? (
                "Importing…"
              ) : (
                <>
                  <FileSpreadsheet className="size-4" />
                  Import {parsed.hazards.length} hazard
                  {parsed.hazards.length === 1 ? "" : "s"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            {!subjectReady && parsed.hazards.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Choose where it belongs above first.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
