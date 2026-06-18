import Link from "next/link";
import {
  Plus,
  Building2,
  MapPin,
  Mail,
  Phone,
  ClipboardList,
  LayoutGrid,
  Pencil,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { CenterArchiveButton } from "@/components/centers/center-archive-button";
import { cn } from "@/lib/utils";

interface CentreItem {
  id: string;
  name: string;
  siteCode: string | null;
  isActive: boolean;
  address: string | null;
  contactEmail: string | null;
  phone: string | null;
  _count: { assessments: number; areas: number };
}

export function CentresPanel({ centers }: { centers: CentreItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          The sites in your organisation. Every assessment, area and review
          belongs to a centre.
        </p>
        <Link href="/centers/new" className={buttonClasses({ size: "sm" })}>
          <Plus className="size-4" /> New centre
        </Link>
      </div>

      {centers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No centres yet"
          description="Add your first leisure centre to start recording risk assessments."
          action={
            <Link href="/centers/new" className={buttonClasses()}>
              <Plus className="size-4" /> New centre
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {centers.map((c) => (
            <div
              key={c.id}
              className={cn(
                "flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs",
                !c.isActive && "opacity-75",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold leading-tight text-ink">
                      {c.name}
                    </h2>
                    {c.siteCode ? (
                      <span className="font-mono text-xs font-semibold text-brand-strong">
                        {c.siteCode}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-600">
                        No site code — edit to add
                      </span>
                    )}
                  </div>
                </div>
                {!c.isActive && (
                  <Badge className="border border-slate-200 bg-slate-100 text-slate-500">
                    Archived
                  </Badge>
                )}
              </div>

              <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {c.address && (
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-faint" />
                    <span>{c.address}</span>
                  </div>
                )}
                {c.contactEmail && (
                  <div className="flex gap-2">
                    <Mail className="mt-0.5 size-4 shrink-0 text-faint" />
                    <span>{c.contactEmail}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0 text-faint" />
                    <span>{c.phone}</span>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex items-center gap-4 border-t border-line pt-4 text-sm">
                <span className="flex items-center gap-1.5 text-ink-soft">
                  <ClipboardList className="size-4 text-faint" />
                  <span className="font-semibold tnum">
                    {c._count.assessments}
                  </span>
                  <span className="text-muted-foreground">assessments</span>
                </span>
                <span className="flex items-center gap-1.5 text-ink-soft">
                  <LayoutGrid className="size-4 text-faint" />
                  <span className="font-semibold tnum">{c._count.areas}</span>
                  <span className="text-muted-foreground">areas</span>
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={`/centers/${c.id}/edit`}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  <Pencil className="size-3.5" /> Edit
                </Link>
                <CenterArchiveButton id={c.id} isActive={c.isActive} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
