import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { CenterForm } from "@/components/centers/center-form";
import { CenterDeleteButton } from "@/components/centers/center-delete-button";
import { getCenter } from "@/lib/data/centers";
import { updateCenter } from "@/lib/actions/centers";

export const metadata = { title: "Edit centre" };

export default async function EditCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const center = await getCenter(id);
  if (!center) notFound();

  const updateAction = updateCenter.bind(null, center.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/centers"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Centres
        </Link>
        <PageHeader eyebrow="Edit centre" title={center.name} />
      </div>

      <Card className="p-6">
        <CenterForm
          action={updateAction}
          center={center}
          submitLabel="Save changes"
        />
      </Card>

      <Card className="border-critical-line/60 p-6">
        <h2 className="text-sm font-semibold text-ink">Danger zone</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Deleting a centre is permanent. It is only possible once the centre has
          no assessments.
        </p>
        <CenterDeleteButton id={center.id} />
      </Card>
    </div>
  );
}
