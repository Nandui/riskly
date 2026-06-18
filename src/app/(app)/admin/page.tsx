import Link from "next/link";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { CentresPanel } from "@/components/centers/centres-panel";
import { UserManager } from "@/components/users/user-manager";
import { RolePermissionMatrix } from "@/components/users/role-permission-matrix";
import { LibraryManager } from "@/components/library/library-manager";
import { getCenterContext } from "@/lib/center-context";
import { listCenters } from "@/lib/data/centers";
import { listUsers } from "@/lib/data/users";
import {
  listAreas,
  listRoles,
  listActivities,
  listDepartments,
  type LibraryEntity,
} from "@/lib/data/library";
import { requireCapability } from "@/lib/auth";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const me = await requireCapability("admin");
  const { selected, centers: ctxCenters } = await getCenterContext();

  const [centers, users, roles, activities, departments] = await Promise.all([
    listCenters(),
    listUsers(),
    listRoles(),
    listActivities(),
    listDepartments(),
  ]);

  const areaEntries = await Promise.all(
    ctxCenters.map(async (c) => [c.id, await listAreas(c.id)] as const),
  );
  const areasByCenter: Record<string, LibraryEntity[]> =
    Object.fromEntries(areaEntries);

  const centresPanel = <CentresPanel centers={centers} />;

  const usersPanel = (
    <div className="space-y-6">
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
      <RolePermissionMatrix />
    </div>
  );

  const libraryPanel = (
    <LibraryManager
      centers={ctxCenters.map((c) => ({ id: c.id, name: c.name }))}
      defaultCenterId={selected?.id ?? ctxCenters[0]?.id ?? null}
      areasByCenter={areasByCenter}
      roles={roles}
      activities={activities}
      departments={departments}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Admin"
        description="Set up your organisation — centres, users, and the shared library of areas, roles, activities and departments."
        actions={
          <Link
            href="/admin/audit"
            className={buttonClasses({ variant: "secondary" })}
          >
            <ScrollText className="size-4" /> Audit log
          </Link>
        }
      />
      <AdminWorkspace
        centres={centresPanel}
        users={usersPanel}
        library={libraryPanel}
      />
    </div>
  );
}
