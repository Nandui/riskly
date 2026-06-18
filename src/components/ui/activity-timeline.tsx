import {
  ShieldCheck,
  FilePlus2,
  Pencil,
  Upload,
  Undo2,
  CircleCheck,
  MessageSquarePlus,
  CheckCheck,
  ListPlus,
  Trash2,
  Dot,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; Icon: LucideIcon }> = {
  created: { label: "Created", Icon: FilePlus2 },
  updated: { label: "Edited", Icon: Pencil },
  hazard_added: { label: "Hazard added", Icon: ListPlus },
  imported: { label: "Imported", Icon: Upload },
  approved: { label: "Approved", Icon: ShieldCheck },
  approval_revoked: { label: "Approval withdrawn", Icon: Undo2 },
  review_logged: { label: "Review logged", Icon: CircleCheck },
  review_requested: { label: "Review requested", Icon: MessageSquarePlus },
  review_request_resolved: { label: "Review request resolved", Icon: CheckCheck },
  deleted: { label: "Deleted", Icon: Trash2 },
};

export interface ActivityItem {
  id: string;
  action: string;
  detail?: string | null;
  userName?: string | null;
  timestamp: string;
}

// A polished vertical activity timeline shared by the assessment page and the
// detail drawer. Driven by the audit log.
export function ActivityTimeline({
  items,
  className,
}: {
  items: ActivityItem[];
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <ol className={cn("relative", className)}>
      {items.map((e, i) => {
        const meta = ACTION_META[e.action] ?? { label: e.action, Icon: Dot };
        const last = i === items.length - 1;
        return (
          <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className="absolute left-3 top-7 bottom-0 w-px -translate-x-1/2 bg-line"
              />
            )}
            <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted-foreground">
              <meta.Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">
                <span className="font-medium">{meta.label}</span>
                {e.detail && (
                  <span className="text-muted-foreground"> — {e.detail}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.userName ?? "System"} · {e.timestamp}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
