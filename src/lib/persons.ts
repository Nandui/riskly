// The standardised "persons at risk" categories. Every hazard records who is
// at risk using one or more of these — free-text values (legacy data, AI
// output, CSV imports) are mapped to the closest categories by normalize().
//
// Kept dependency-free (no "@/" imports) so prisma/ scripts run by tsx — which
// doesn't resolve the path alias — can import it relatively.

export const PERSONS_AT_RISK = [
  "Staff",
  "Customers",
  "Children",
  "Contractors",
  "Visitors",
] as const;

export type PersonAtRisk = (typeof PERSONS_AT_RISK)[number];

// Keyword stems → canonical category (case-insensitive, plural-tolerant).
const MATCHERS: { person: PersonAtRisk; re: RegExp }[] = [
  {
    person: "Staff",
    re: /\b(staff|employee|reception|maintenance|clean|lifeguard|instructor|coach|trainer|warden|personnel|worker|attendant|operative|officer|teacher|supervisor|manager|caretaker)/i,
  },
  {
    person: "Customers",
    re: /\b(customer|member|patron|participant|swimmer|bather|client|gym|attendee|user)/i,
  },
  {
    person: "Children",
    re: /\b(child|kid|junior|minor|infant|toddler|pupil|school)/i,
  },
  {
    person: "Contractors",
    re: /\b(contractor|sub-?contractor|supplier|deliver|vendor|engineer|tradesperson|installer)/i,
  },
  {
    person: "Visitors",
    re: /\b(visitor|public|spectator|parent|guardian|guest|observer|viewer|passer)/i,
  },
];

// Map any free-text value to a canonical, comma-separated list in canonical
// order (e.g. "Members of the public, staff" -> "Staff, Visitors"). Returns ""
// when nothing maps.
export function normalizePersonsAtRisk(raw: string | null | undefined): string {
  if (!raw) return "";
  // "members of the public" is Visitors — strip the phrase first so the bare
  // word "member" doesn't also pull in Customers.
  const text = ` ${raw.toLowerCase()} `.replace(
    /members?\s+of\s+the\s+public/g,
    " public ",
  );
  const found = MATCHERS.filter((m) => m.re.test(text)).map((m) => m.person);
  return PERSONS_AT_RISK.filter((p) => found.includes(p)).join(", ");
}

// The canonical categories present in a stored value, for chips and filters.
export function parsePersons(value: string | null | undefined): PersonAtRisk[] {
  const normalized = normalizePersonsAtRisk(value);
  return normalized ? (normalized.split(", ") as PersonAtRisk[]) : [];
}
