import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { addMonths, differenceInCalendarDays, format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "centre";
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return isValid(d) ? d : null;
}

export function formatDate(value: Date | string | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy") : "—";
}

export function formatDateTime(value: Date | string | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy, HH:mm") : "—";
}

export function toDateInputValue(
  value: Date | string | null | undefined,
): string {
  const d = toDate(value);
  return d ? format(d, "yyyy-MM-dd") : "";
}

export function computeNextReviewDate(base: Date, months: number): Date {
  return addMonths(base, months);
}

export type ReviewUrgency = "overdue" | "due" | "ok" | "none";

export interface ReviewStatus {
  key: ReviewUrgency;
  label: string;
  days: number; // days until due (negative = overdue)
}

export function getReviewStatus(
  value: Date | string | null | undefined,
  dueSoonDays = 30,
): ReviewStatus {
  const d = toDate(value);
  if (!d) return { key: "ok", label: "No review date", days: Infinity };
  const days = differenceInCalendarDays(d, new Date());
  if (days < 0)
    return { key: "overdue", label: `Overdue by ${Math.abs(days)}d`, days };
  if (days === 0) return { key: "due", label: "Due today", days };
  if (days <= dueSoonDays) return { key: "due", label: `Due in ${days}d`, days };
  return { key: "ok", label: `Due in ${days}d`, days };
}

// Status-aware review status. A Draft isn't in force yet, so it has no review
// schedule — it reads as "Not scheduled" and drops out of the due/overdue
// counts and the review queue. Everything else uses the date.
export function reviewStatusFor(
  a: { status: string; nextReviewDate: Date | string | null | undefined },
  dueSoonDays = 30,
): ReviewStatus {
  if (a.status === "Draft")
    return { key: "none", label: "Not scheduled", days: Infinity };
  return getReviewStatus(a.nextReviewDate, dueSoonDays);
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
