import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { SignoffPanel } from "@/components/company/signoff-panel";

export const metadata = { title: "Policy sign-off" };

export default async function SignoffPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stage 9" title="Policy sign-off" description="Publish the Acceptable Use Policy, send the sign link, and watch who has read and confirmed it. New hires found by monitoring are added here automatically." />
      <SignoffPanel engagementId={ctx.engagement.id} hasDocuments={ctx.stats.documents > 0} companyId={ctx.org.id} />
    </div>
  );
}
