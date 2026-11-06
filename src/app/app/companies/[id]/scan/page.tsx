import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ownedOrganization } from "@/lib/ownership";
import { PageHeader } from "@/components/app/primitives";
import { ScanPanel } from "@/components/company/scan-panel";

export const metadata = { title: "Workspace scan" };

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  if (!(await ownedOrganization(session.user.id, id))) notFound();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stage 2"
        title="Workspace scan"
        description="Read-only. The client's Google Workspace or Microsoft 365 admin approves access once; we list every third-party app connected to work accounts and flag the AI ones. Nothing is installed on anyone's computer."
      />
      <ScanPanel organizationId={id} />
    </div>
  );
}
