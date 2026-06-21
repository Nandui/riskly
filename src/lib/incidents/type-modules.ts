// Per-type capture modules — the single source of truth for what each incident
// type asks for. Consumed by the create form (which sections + module fields to
// render), the detail page (what to display), and the severity logic. Client-safe.

export type IncidentSection = "injured" | "witnesses";

// Per-type field modules captured at intake (beyond the shared core).
export type ModuleKey = "accident" | "aquatic" | "medical" | "facility" | "security";

export type TypeModule = {
  label: string;
  examples: string;
  sections: IncidentSection[]; // people sections
  modules: ModuleKey[]; // type-specific field modules (intake)
  // Ask the reporter for an actual-outcome severity at intake? False for types
  // with no inherent personal injury (the manager rates potential at triage).
  outcomeAtIntake: boolean;
};

export const TYPE_MODULES: Record<string, TypeModule> = {
  Accident: {
    label: "Accident",
    examples: "Someone was hurt — a slip, a fall, a cut, a knock.",
    sections: ["injured", "witnesses"],
    modules: ["accident"],
    outcomeAtIntake: true,
  },
  NearMiss: {
    label: "Near miss",
    examples: "Could have caused harm but didn't — a wet floor someone nearly slipped on.",
    sections: ["witnesses"],
    modules: [],
    outcomeAtIntake: false,
  },
  DangerousOccurrence: {
    label: "Dangerous occurrence",
    examples: "A high-potential event — plant failure, structural collapse, gas escape — reportable even with no injury.",
    sections: ["witnesses"],
    modules: [],
    outcomeAtIntake: false,
  },
  Aquatic: {
    label: "Aquatic / water rescue",
    examples: "A lifeguard intervention, assisted rescue, spinal, near-drowning or EAP activation.",
    sections: ["injured", "witnesses"],
    modules: ["aquatic"],
    outcomeAtIntake: true,
  },
  Medical: {
    label: "Medical / first aid",
    examples: "Someone took unwell — collapse, seizure, cardiac — with no external cause.",
    sections: ["injured", "witnesses"],
    modules: ["medical"],
    outcomeAtIntake: true,
  },
  Security: {
    label: "Security / antisocial",
    examples: "Theft, vandalism, trespass, aggression toward staff, an ejection.",
    sections: ["injured", "witnesses"],
    modules: ["security"],
    outcomeAtIntake: true,
  },
  Facility: {
    label: "Facility / environmental",
    examples: "Chemical spill, water-quality excursion, AFR (pool closure), fire alarm, evacuation.",
    sections: ["witnesses"],
    modules: ["facility"],
    outcomeAtIntake: false,
  },
  Other: {
    label: "Other",
    examples: "Anything else worth recording.",
    sections: ["injured", "witnesses"],
    modules: [],
    outcomeAtIntake: true,
  },
};

// Legacy / unknown types fall back to the broad shape so historical incidents
// still render their people sections.
const FALLBACK: TypeModule = {
  label: "Incident",
  examples: "",
  sections: ["injured", "witnesses"],
  modules: [],
  outcomeAtIntake: true,
};

export function moduleFor(type: string): TypeModule {
  return TYPE_MODULES[type] ?? FALLBACK;
}

export function typeHasSection(type: string, section: IncidentSection): boolean {
  return moduleFor(type).sections.includes(section);
}

export function typeHasModule(type: string, module: ModuleKey): boolean {
  return moduleFor(type).modules.includes(module);
}

// Emergency-response questions (ambulance / AED / CPR) apply to the modules
// where a casualty is plausible.
const RESPONSE_MODULES: ModuleKey[] = ["accident", "aquatic", "medical"];

export function typeHasResponseBlock(type: string): boolean {
  return moduleFor(type).modules.some((m) => RESPONSE_MODULES.includes(m));
}
