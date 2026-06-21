import Link from "next/link";
import {
  Plus,
  ShieldCheck,
  CircleAlert,
  ListChecks,
  Siren,
  Send,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { AssessmentTable } from "@/components/assessments/assessment-table";
import { ActionsOverviewTable } from "@/components/incidents/actions-overview-table";
import { IncidentsTableView } from "@/components/incidents/incidents-table-view";
import { getCenterContext } from "@/lib/center-context";
import { requireUser, can } from "@/lib/auth";
import {
  getAwaitingCeoApproval,
  getNeedsAction,
  getMyReviewRequests,
} from "@/lib/data/monitoring";
import { getActionsAssignedTo, getMyIncidentDrafts } from "@/lib/data/incidents";
import { canReportIncidents, canManageIncidents } from "@/lib/incidents/permissions";
import { assessmentTitle } from "@/lib/data/assessments";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "For you" };

const REQUEST_STATE: Record<string, { label: string; pill: string }> = {
  Open: { label: "Open", pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  Actioned: {
    label: "Actioned",
    pill: "bg-brand-soft text-brand-strong border border-brand/25",
  },
  Dismissed: {
    label: "Dismissed",
    pill: "bg-slate-100 text-slate-500 border border-slate-200",
  },
};

function SectionHeading({
  icon: Icon,
  title,
  count,
  tone = "default",
}: {
  icon: typeof CircleAlert;
  title: string;
  count: number;
  tone?: "default" | "critical";
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
      <Icon className={cn("size-4", tone === "critical" ? "text-critical" : "text-medium")} />
      {title}
      <span className="font-normal tnum text-muted-foreground">{count}</span>
    </h2>
  );
}

export default async function ForYouPage() {
  const me = await requireUser();
  const { selected, selectedId } = await getCenterContext();

  const assignee = me.name ?? me.email ?? "";
  const canApprove = can(me, "approveAssessments");
  const canRequest = can(me, "requestReview");
  const canReport = canReportIncidents(me);
  const canEdit = can(me, "editContent");
  const canManageInc = canManageIncidents(me);

  const [awaitingApprovalRaw, needsAction, myActions, myDrafts, myRequests] =
    await Promise.all([
      canApprove ? getAwaitingCeoApproval(selectedId) : Promise.resolve([]),
      getNeedsAction(me.id, selectedId),
      assignee ? getActionsAssignedTo(assignee, selectedId) : Promise.resolve([]),
      getMyIncidentDrafts(me.id, selectedId),
      canRequest ? getMyReviewRequests(me.id, selectedId) : Promise.resolve([]),
    ]);

  // You can't grant the CEO sign-off on your own assessment (separation of duties).
  const awaitingApproval = awaitingApprovalRaw.filter((a) => a.ownerId !== me.id);
  const overdueActions = myActions.filter((a) => a.status === "Overdue").length;

  const pending =
    awaitingApproval.length +
    needsAction.length +
    myActions.length +
    myDrafts.length;

  const firstName = (me.name ?? me.email ?? "there").split(/[\s@.]+/)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selected ? selected.name : "All centres"}
        title="For you"
        description="Everything waiting on you across risk assessments and incidents."
        actions={
          <>
            {canReport && (
              <Link href="/incidents/new" className={buttonClasses()}>
                <Plus className="size-4" /> Report incident
              </Link>
            )}
            {canEdit && (
              <Link
                href="/assessments/new"
                className={buttonClasses({ variant: "secondary" })}
              >
                <Plus className="size-4" /> New assessment
              </Link>
            )}
          </>
        }
      />

      {pending === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-low-bg text-low">
            <CheckCircle2 className="size-5" />
          </div>
          <h3 className="text-base font-semibold text-ink">
            You&apos;re all caught up, {firstName}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Nothing needs your attention right now. Report an incident or check
            the dashboards to stay ahead.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {canReport && (
              <Link href="/incidents/new" className={buttonClasses({ variant: "secondary" })}>
                Report incident
              </Link>
            )}
            <Link href="/overview" className={buttonClasses({ variant: "secondary" })}>
              Risk overview
            </Link>
            <Link href="/incidents" className={buttonClasses({ variant: "secondary" })}>
              Incidents overview
            </Link>
          </div>
        </div>
      )}

      {awaitingApproval.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={ShieldCheck}
            title="Awaiting your approval"
            count={awaitingApproval.length}
          />
          <p className="text-sm text-muted-foreground">
            Assessments that need your CEO sign-off. Open one to review and approve.
          </p>
          <AssessmentTable rows={awaitingApproval} showCenter={!selected} />
        </section>
      )}

      {needsAction.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={CircleAlert}
            title="Assessments needing your action"
            count={needsAction.length}
          />
          <p className="text-sm text-muted-foreground">
            Assessments you own that are back under review — re-check them and get
            them re-approved.
          </p>
          <AssessmentTable rows={needsAction} showCenter={!selected} />
        </section>
      )}

      {myActions.length > 0 && (
        <section className="space-y-3">
          <SectionHeading
            icon={ListChecks}
            title="Your follow-up actions"
            count={myActions.length}
            tone={overdueActions > 0 ? "critical" : "default"}
          />
          <p className="text-sm text-muted-foreground">
            Incident follow-up actions assigned to you
            {overdueActions > 0 ? ` — ${overdueActions} overdue` : ""}.
          </p>
          <ActionsOverviewTable
            rows={myActions}
            showCenter={!selected}
            canManage={canManageInc}
          />
        </section>
      )}

      {myDrafts.length > 0 && (
        <section className="space-y-3">
          <SectionHeading icon={Siren} title="Finish your drafts" count={myDrafts.length} />
          <p className="text-sm text-muted-foreground">
            Incident reports you started but haven&apos;t submitted yet.
          </p>
          <IncidentsTableView rows={myDrafts} showCenter={!selected} compact />
        </section>
      )}

      {canRequest && myRequests.length > 0 && (
        <section className="space-y-3">
          <SectionHeading icon={Send} title="Your review requests" count={myRequests.length} />
          <p className="text-sm text-muted-foreground">
            Review requests you&apos;ve raised and where they stand.
          </p>
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-xs">
            <ul className="divide-y divide-line">
              {myRequests.map((r) => {
                const stateMeta = REQUEST_STATE[r.status] ?? REQUEST_STATE.Open;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/assessments/${r.assessment.id}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-surface-2/60"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.assessment.reference}
                          </span>{" "}
                          · {assessmentTitle(r.assessment)}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {r.notes}
                        </p>
                        {r.status !== "Open" && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {stateMeta.label}
                            {r.resolvedAt ? ` ${formatDate(r.resolvedAt)}` : ""}
                            {r.resolvedBy
                              ? ` by ${r.resolvedBy.name ?? r.resolvedBy.email}`
                              : ""}
                            {r.resolutionNote ? ` — ${r.resolutionNote}` : ""}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          stateMeta.pill,
                        )}
                      >
                        {stateMeta.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {pending > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <Link href="/overview" className="inline-flex items-center gap-1 text-primary hover:underline">
            Risk overview <ArrowRight className="size-3.5" />
          </Link>
          <Link href="/incidents" className="inline-flex items-center gap-1 text-primary hover:underline">
            Incidents overview <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
