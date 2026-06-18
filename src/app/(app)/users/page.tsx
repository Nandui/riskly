import { PageHeader } from "@/components/ui/page-header";
import { requireCapability } from "@/lib/auth";
import { listUsers } from "@/lib/data/users";
import { UserManager } from "@/components/users/user-manager";
import { ROLES, ROLE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireCapability("admin");
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Manage who can access Riskly and what each person can do. Staff sign in with their leisureworldcork.com Google account."
      />

      <UserManager
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          role: u.role,
          isActive: u.isActive,
          isSelf: u.id === me.id,
        }))}
      />

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-ink">What each role can do</h2>
        <dl className="mt-3 space-y-2.5">
          {ROLES.map((r) => (
            <div key={r.value} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <dt className="w-24 shrink-0">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                    ROLE_META[r.value].pill,
                  )}
                >
                  {r.label}
                </span>
              </dt>
              <dd className="text-muted">{ROLE_META[r.value].description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
