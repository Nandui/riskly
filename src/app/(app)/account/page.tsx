import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { ROLE_META } from "@/lib/constants";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const me = await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your account"
        title={me.name ?? me.email ?? "Account"}
        description="Your sign-in details and password."
      />

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-0.5 font-medium text-ink">{me.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {ROLE_META[me.role]?.label ?? me.role}
            </dd>
          </div>
        </dl>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
