import Link from "next/link";
import {
  ArrowLeft,
  FilePlus2,
  Pencil,
  ListPlus,
  Upload,
  ShieldCheck,
  Undo2,
  CircleCheck,
  MessageSquarePlus,
  CheckCheck,
  Trash2,
  Dot,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listAuditLog } from "@/lib/data/audit";
import { requireCapability } from "@/lib/auth";
import { formatDateTime, cn } from "@/lib/utils";

export const metadata = { title: "Audit log" };

const META: Record<string, { label: string; Icon: LucideIcon }> = {
  created: { label: "Created", Icon: FilePlus2 },
  updated: { label: "Edited", Icon: Pencil },
  hazard_added: { label: "Hazard added", Icon: ListPlus },
  imported: { label: "Imported", Icon: Upload },
  approved: { label: "Approved", Icon: ShieldCheck },
  approval_revoked: { label: "Approval withdrawn", Icon: Undo2 },
  review_logged: { label: "Review logged", Icon: CircleCheck },
  review_requested: { label: "Review requested", Icon: MessageSquarePlus },
  review_request_resolved: {
    label: "Review request resolved",
    Icon: CheckCheck,
  },
  deleted: { label: "Deleted", Icon: Trash2 },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireCapability("admin");
  const sp = await searchParams;
  const deletedOnly = sp.filter === "deleted";
  const entries = await listAuditLog({ deletedOnly });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Admin
        </Link>
        <PageHeader
          eyebrow="Administration"
          title="Audit log"
          description="Every recorded action on assessments, newest first. Deleted assessments keep their full history here for review — it isn't erased when a record is removed."
        />
      </div>

      <div className="inline-flex gap-1 rounded-lg bg-surface-2 p-1">
        <FilterTab href="/admin/audit" active={!deletedOnly}>
          All activity
        </FilterTab>
        <FilterTab href="/admin/audit?filter=deleted" active={deletedOnly}>
          Deleted assessments
        </FilterTab>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title={deletedOnly ? "No deleted assessments" : "No activity yet"}
          description={
            deletedOnly
              ? "Nothing has been deleted. When an assessment is deleted, its full history is preserved here."
              : "Actions appear here as assessments are created, edited, reviewed and deleted."
          }
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
          {entries.map((e) => {
            const meta = META[e.action] ?? { label: e.action, Icon: Dot };
            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
                  <meta.Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-medium">{meta.label}</span>
                    {e.detail && (
                      <span className="whitespace-pre-line text-muted-foreground">
                        {" "}
                        — {e.detail}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.reference &&
                      (e.deleted ? (
                        <span className="mr-1.5 inline-flex items-center gap-1.5">
                          <span className="font-mono text-faint">
                            {e.reference}
                          </span>
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-slate-500">
                            deleted
                          </span>
                          <span>·</span>
                        </span>
                      ) : (
                        <>
                          <Link
                            href={`/assessments/${e.assessmentId}`}
                            className="font-mono text-faint hover:text-primary hover:underline"
                          >
                            {e.reference}
                          </Link>{" "}
                          ·{" "}
                        </>
                      ))}
                    {e.userName ?? "System"} · {formatDateTime(e.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-surface text-primary shadow-xs"
          : "text-muted-foreground hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
