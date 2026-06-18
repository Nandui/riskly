"use client";

import { useState } from "react";
import { Building2, Users, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "centres", label: "Centres", icon: Building2 },
  { key: "users", label: "Users", icon: Users },
  { key: "library", label: "Library", icon: Tags },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function AdminWorkspace({
  centres,
  users,
  library,
}: {
  centres: React.ReactNode;
  users: React.ReactNode;
  library: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("centres");
  const panels: Record<TabKey, React.ReactNode> = { centres, users, library };

  return (
    <div className="space-y-6">
      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-ink",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div>{panels[tab]}</div>
    </div>
  );
}
