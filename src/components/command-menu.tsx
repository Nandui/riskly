"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Plus, Upload, Building2, Check, type LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { selectCenter } from "@/lib/actions/center";
import { ALL_CENTERS, type CenterSummary } from "@/lib/center-shared";

export interface NavCommand {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function CommandMenu({
  open,
  onOpenChange,
  nav,
  canCreate,
  centers,
  selectedId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nav: NavCommand[];
  canCreate: boolean;
  centers: CenterSummary[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const switchCentre = (id: string) => {
    onOpenChange(false);
    startTransition(() => {
      void selectCenter(id);
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions, centres…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Go to">
          {nav.map((item) => (
            <CommandItem
              key={item.href}
              value={`go ${item.label}`}
              onSelect={() => go(item.href)}
            >
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {canCreate && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                value="new assessment create"
                onSelect={() => go("/assessments/new")}
              >
                <Plus />
                New assessment
                <CommandShortcut>N</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="import assessments csv"
                onSelect={() => go("/assessments/import")}
              >
                <Upload />
                Import assessments
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {centers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Switch centre">
              <CommandItem
                value="all centres"
                onSelect={() => switchCentre(ALL_CENTERS)}
              >
                <Building2 />
                All centres
                {selectedId === null && <Check className="ml-auto" />}
              </CommandItem>
              {centers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`centre ${c.name}`}
                  onSelect={() => switchCentre(c.id)}
                >
                  <Building2 />
                  {c.name}
                  {selectedId === c.id && <Check className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
