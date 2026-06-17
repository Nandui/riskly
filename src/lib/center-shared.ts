// Client-safe constants & types for centre selection (no server-only imports,
// so this is safe to import from client components).

export const CENTER_COOKIE = "riskly_center";
export const ALL_CENTERS = "all";

export interface CenterSummary {
  id: string;
  name: string;
  slug: string;
}
