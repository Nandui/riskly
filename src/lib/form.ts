import { ZodError } from "zod";

export type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export function fieldErrorsFromZod(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// Trim a FormData value and treat empty strings as null (for optional DB fields).
export function emptyToNull(
  value: FormDataEntryValue | null | undefined,
): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}
