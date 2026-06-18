import { PageHeader } from "@/components/ui/page-header";
import { requireCapability } from "@/lib/auth";
import { listUsers } from "@/lib/data/users";
import { UserManager } from "@/components/users/user-manager";
import { RolePermissionMatrix } from "@/components/users/role-permission-matrix";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireCapability("admin");
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Add people, set each person's role, and reset passwords. Everyone signs in with the email and password you set here."
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

      <RolePermissionMatrix />
    </div>
  );
}
