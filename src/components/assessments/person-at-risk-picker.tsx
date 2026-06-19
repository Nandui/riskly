"use client";

import { PERSONS_AT_RISK, parsePersons, type PersonAtRisk } from "@/lib/persons";
import { cn } from "@/lib/utils";

// Multi-select of the standard person-at-risk categories. Stores the selection
// as a canonical, comma-separated string (e.g. "Staff, Customers").
export function PersonAtRiskPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = new Set(parsePersons(value));

  const toggle = (person: PersonAtRisk) => {
    const next = new Set(selected);
    if (next.has(person)) next.delete(person);
    else next.add(person);
    onChange(PERSONS_AT_RISK.filter((p) => next.has(p)).join(", "));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {PERSONS_AT_RISK.map((person) => {
        const on = selected.has(person);
        return (
          <button
            key={person}
            type="button"
            onClick={() => toggle(person)}
            aria-pressed={on}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-line-strong bg-surface text-ink-soft hover:bg-surface-2",
            )}
          >
            {person}
          </button>
        );
      })}
    </div>
  );
}
