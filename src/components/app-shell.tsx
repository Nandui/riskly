"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  BookOpen,
  Building2,
  Tags,
  Menu,
  X,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CenterSwitcher } from "@/components/center-switcher";
import type { CenterSummary } from "@/lib/center-shared";

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/monitoring", label: "Monitoring", icon: CalendarClock },
  { href: "/reference", label: "Reference", icon: BookOpen },
  { href: "/centers", label: "Centres", icon: Building2 },
  { href: "/library", label: "Library", icon: Tags },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white shadow-xs">
        <ShieldAlert className="size-5" />
      </span>
      <div className="leading-none">
        <span className="block font-display text-lg font-semibold tracking-tight text-white">
          Riskly
        </span>
        <span className="text-[0.65rem] uppercase tracking-[0.16em] text-sidebar-muted">
          Risk assessments
        </span>
      </div>
    </div>
  );
}

export function AppShell({
  centers,
  selectedId,
  children,
}: {
  centers: CenterSummary[];
  selectedId: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="flex size-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2"
        >
          <Menu className="size-5" />
        </button>
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand text-white">
            <ShieldAlert className="size-4" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-ink">
            Riskly
          </span>
        </span>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          className="no-print fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar text-sidebar-ink transition-transform duration-200 ease-out",
          "md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Wordmark />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="flex size-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-2 hover:text-white md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <CenterSwitcher centers={centers} selectedId={selectedId} />
        </div>

        <nav className="scroll-slim flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand text-white shadow-xs"
                    : "text-sidebar-ink/80 hover:bg-sidebar-2 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "size-[1.15rem] shrink-0",
                    active ? "text-white" : "text-sidebar-muted group-hover:text-white",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-line px-5 py-4">
          <p className="text-[0.7rem] leading-relaxed text-sidebar-muted">
            One organisation · multiple centres
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
