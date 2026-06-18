import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCenterContext } from "@/lib/center-context";
import { getCurrentUser } from "@/lib/auth";

// Every page renders live, per-request data — never statically generated.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, { centers, selectedId }] = await Promise.all([
    getCurrentUser(),
    getCenterContext(),
  ]);
  if (!user) redirect("/signin");

  return (
    <AppShell
      centers={centers}
      selectedId={selectedId}
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
