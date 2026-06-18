"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  BookOpen,
  Wrench,
  Menu,
  X,
  LogOut,
  Settings,
  Search,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, type Capability } from "@/lib/permissions";
import { CenterSwitcher } from "@/components/center-switcher";
import { CommandMenu } from "@/components/command-menu";
import { buttonClasses } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";
import type { CenterSummary } from "@/lib/center-shared";

interface ShellUser {
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  cap: Capability;
}[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, cap: "view" },
  { href: "/assessments", label: "Assessments", icon: ClipboardList, cap: "view" },
  { href: "/monitoring", label: "Monitoring", icon: CalendarClock, cap: "view" },
  { href: "/reference", label: "Reference", icon: BookOpen, cap: "view" },
  { href: "/admin", label: "Admin", icon: Wrench, cap: "admin" },
];

function initials(user: ShellUser) {
  const base = user.name || user.email || "?";
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Riskly" className="size-9 shrink-0" />
      <div className="leading-none">
        <span className="block font-display text-lg font-semibold tracking-tight text-ink">
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
  user,
  children,
}: {
  centers: CenterSummary[];
  selectedId: string | null;
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const navItems = NAV.filter((item) => can(user, item.cap));
  const navCommands = navItems.map(({ href, label, icon }) => ({
    href,
    label,
    icon,
  }));
  const canCreate = can(user, "editContent");

  // ⌘K / Ctrl+K toggles the command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="size-7" />
          <span className="font-display text-base font-semibold tracking-tight text-ink">
            Riskly
          </span>
        </span>
        <button
          type="button"
          onClick={() => setCmdkOpen(true)}
          aria-label="Search"
          className="ml-auto flex size-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2"
        >
          <Search className="size-5" />
        </button>
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
          "no-print fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-sidebar-line bg-sidebar text-sidebar-ink transition-transform duration-200 ease-out",
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
            className="flex size-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-2 hover:text-ink md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <CenterSwitcher centers={centers} selectedId={selectedId} />
        </div>

        <nav className="scroll-slim flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {navItems.map((item) => {
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
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-ink/80 hover:bg-sidebar-2 hover:text-ink",
                )}
              >
                <item.icon
                  className={cn(
                    "size-[1.15rem] shrink-0",
                    active
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-muted group-hover:text-ink",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Signed-in user + sign out */}
        <div className="border-t border-sidebar-line p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                referrerPolicy="no-referrer"
                className="size-8 rounded-full"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-2 text-xs font-semibold text-sidebar-ink">
                {initials(user)}
              </span>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-ink">
                {user.name ?? user.email}
              </p>
              <p className="truncate text-[0.7rem] text-sidebar-muted">
                {user.role}
              </p>
            </div>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              aria-label="Account settings"
              title="Account settings"
              className="flex size-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-2 hover:text-ink"
            >
              <Settings className="size-4" />
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="flex size-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-2 hover:text-ink"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top bar: global search + primary action */}
        <div className="no-print sticky top-0 z-30 hidden h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur md:flex lg:px-8">
          <button
            type="button"
            onClick={() => setCmdkOpen(true)}
            className="group flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm text-faint shadow-xs transition-colors hover:text-muted-foreground"
          >
            <Search className="size-4" />
            <span>Search…</span>
            <kbd className="ml-auto inline-flex items-center gap-0.5 rounded border border-line bg-surface-2 px-1.5 font-mono text-[0.7rem] text-faint">
              ⌘K
            </kbd>
          </button>
          {canCreate && (
            <Link
              href="/assessments/new"
              className={cn(buttonClasses({ size: "sm" }), "ml-auto")}
            >
              <Plus className="size-4" /> New assessment
            </Link>
          )}
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      <CommandMenu
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        nav={navCommands}
        canCreate={canCreate}
        centers={centers}
        selectedId={selectedId}
      />
    </div>
  );
}
