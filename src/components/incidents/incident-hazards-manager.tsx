"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/ui/risk-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/form";
import {
  setIncidentHazards,
  unlinkIncidentHazard,
} from "@/lib/actions/incidents";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form";
import type {
  IncidentHazardLinkItem,
  LinkableHazard,
} from "@/lib/incidents/types";

// Sentinel filter values for the area picker.
const ALL = "__all";
const NONE = "__none"; // hazards from role / activity assessments (no area)

export function IncidentHazardsManager({
  incidentId,
  linked,
  selectable,
  defaultAreaId,
  canManage,
}: {
  incidentId: string;
  linked: IncidentHazardLinkItem[];
  selectable: LinkableHazard[];
  defaultAreaId: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removePending, startRemove] = useTransition();

  // Nothing to show and nothing to do → render nothing (read-only viewers).
  if (!canManage && linked.length === 0) return null;

  const remove = (linkId: string) => {
    setRemovingId(linkId);
    startRemove(async () => {
      const res = await unlinkIncidentHazard(linkId);
      if (res && !res.ok) {
        toast.error(res.error ?? "Could not remove the hazard.");
      } else {
        toast.success("Hazard unlinked.");
        router.refresh();
      }
      setRemovingId(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>
            Related hazards{" "}
            <span className="font-normal text-muted-foreground">
              ({linked.length})
            </span>
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hazards from this centre&apos;s risk assessments that relate to this
            incident — picked from the area where it happened.
          </p>
        </div>
        {canManage && selectable.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setOpen(true)}
          >
            <ShieldAlert className="size-4" /> Link hazards
          </Button>
        )}
      </CardHeader>

      <div className="space-y-3 p-5">
        {linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canManage && selectable.length === 0
              ? "No risk assessments with hazards exist for this centre yet."
              : "No related hazards linked yet."}
          </p>
        ) : (
          linked.map((h) => (
            <div
              key={h.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface-2/40 p-4"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge
                    likelihood={h.likelihood}
                    severity={h.severity}
                    size="sm"
                  />
                  <p className="font-medium text-ink">{h.title}</p>
                  <CategoryBadge category={h.riskCategory} />
                </div>
                <p className="text-xs text-muted-foreground">
                  <Link
                    href={`/assessments/${h.assessmentId}`}
                    className="inline-flex items-center gap-1 font-mono tracking-wide hover:text-ink hover:underline"
                  >
                    {h.hazardRef}
                    <ExternalLink className="size-3" />
                  </Link>
                  {" · "}
                  {h.assessmentTitle}
                  {h.areaName ? ` · ${h.areaName}` : ""}
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => remove(h.id)}
                  disabled={removePending && removingId === h.id}
                  aria-label="Unlink hazard"
                  title="Unlink hazard"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-critical-bg hover:text-critical disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))
        )}

        {canManage && linked.length === 0 && selectable.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Link the first hazard
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {/* Remount per-open so the selection resets to the saved state. */}
          {open && (
            <LinkHazardsForm
              incidentId={incidentId}
              linked={linked}
              selectable={selectable}
              defaultAreaId={defaultAreaId}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LinkHazardsForm({
  incidentId,
  linked,
  selectable,
  defaultAreaId,
  onDone,
}: {
  incidentId: string;
  linked: IncidentHazardLinkItem[];
  selectable: LinkableHazard[];
  defaultAreaId: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setIncidentHazards,
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(linked.map((l) => l.hazardId)),
  );

  // Distinct areas present in the selectable hazards, plus a flag for hazards
  // that belong to a role / activity assessment (no area).
  const { areas, hasNonArea } = useMemo(() => {
    const map = new Map<string, string>();
    let nonArea = false;
    for (const h of selectable) {
      if (h.areaId) map.set(h.areaId, h.areaName ?? "Area");
      else nonArea = true;
    }
    return {
      areas: Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      hasNonArea: nonArea,
    };
  }, [selectable]);

  // Default the filter to the incident's area when it has hazards; otherwise
  // show everything.
  const [filter, setFilter] = useState<string>(() =>
    defaultAreaId && selectable.some((h) => h.areaId === defaultAreaId)
      ? defaultAreaId
      : ALL,
  );

  const visible = useMemo(() => {
    if (filter === ALL) return selectable;
    if (filter === NONE) return selectable.filter((h) => h.areaId == null);
    return selectable.filter((h) => h.areaId === filter);
  }, [selectable, filter]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visibleIds = visible.map((h) => h.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const toggleVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  useEffect(() => {
    if (state?.ok) {
      onDone();
      toast.success("Related hazards updated.");
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <>
      <DialogHeader className="border-b border-line p-5 pr-12 text-left">
        <DialogTitle>Link related hazards</DialogTitle>
        <DialogDescription>
          Pick the hazards from this centre&apos;s assessments that relate to
          this incident. Filter by area to focus on where it happened.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div>
          <Label htmlFor="hazard-area-filter">Area</Label>
          <Select
            id="hazard-area-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value={ALL}>All areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            {hasNonArea && (
              <option value={NONE}>Not area-specific (role / activity)</option>
            )}
          </Select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="mb-0">
              Hazards{" "}
              <span className="font-normal text-muted-foreground">
                ({selected.size} selected)
              </span>
            </Label>
            {visible.length > 0 && (
              <button
                type="button"
                onClick={toggleVisible}
                className="text-xs font-medium text-primary hover:underline"
              >
                {allVisibleSelected ? "Clear shown" : "Select shown"}
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-8 text-center text-sm text-muted-foreground">
              No hazards for this area. Try another area or “All areas”.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {visible.map((h) => {
                const checked = selected.has(h.id);
                return (
                  <li key={h.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                        checked
                          ? "border-primary/40 bg-accent/40"
                          : "border-line hover:bg-surface-2/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(h.id)}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                          <RiskBadge
                            likelihood={h.likelihood}
                            severity={h.severity}
                            size="sm"
                          />
                          <span className="font-mono text-[0.625rem] tracking-wide text-faint">
                            {h.hazardRef}
                          </span>
                        </span>
                        <span className="block truncate text-sm font-medium text-ink">
                          {h.title}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="incidentId" value={incidentId} />
        <input
          type="hidden"
          name="hazardIds"
          value={JSON.stringify([...selected])}
        />
        {state && !state.ok && state.error && (
          <p className="px-5 pt-3 text-sm font-medium text-critical">
            {state.error}
          </p>
        )}
        <DialogFooter className="border-t border-line p-4">
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save selection"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
