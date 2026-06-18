import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { CenterForm } from "@/components/centers/center-form";
import { createCenter } from "@/lib/actions/centers";
import { requireCapability } from "@/lib/auth";

export const metadata = { title: "New centre" };

export default async function NewCenterPage() {
  await requireCapability("admin");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Admin
        </Link>
        <PageHeader eyebrow="New centre" title="Add a centre" />
      </div>
      <Card className="p-6">
        <CenterForm action={createCenter} submitLabel="Create centre" />
      </Card>
    </div>
  );
}
