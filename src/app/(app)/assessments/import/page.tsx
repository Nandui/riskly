import { PageHeader } from "@/components/ui/page-header";
import { requireCapability } from "@/lib/auth";
import { getImportOptions } from "@/lib/data/library";
import { AssessmentImporter } from "@/components/assessments/assessment-importer";

export const metadata = { title: "Import assessment" };

export default async function ImportPage() {
  await requireCapability("editContent");
  const options = await getImportOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assessments"
        title="Import from a spreadsheet"
        description="Bring an area's hazards across from Notion (or any CSV). Choose where they belong, upload the file, and review before importing."
      />
      <AssessmentImporter options={options} />
    </div>
  );
}
