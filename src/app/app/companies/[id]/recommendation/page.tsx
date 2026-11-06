import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { RecommendationPanel } from "@/components/company/recommendation-panel";

export const metadata = { title: "Platform recommendation" };

export default async function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stage 7" title="Platform recommendation" description="Which team AI plan the company should buy. Scored on suite fit, what staff already use, compliance needs, cost and admin controls. Independent: no vendor pays us." />
      <RecommendationPanel engagementId={ctx.engagement.id} profileComplete={ctx.done.profile} companyId={ctx.org.id} />
    </div>
  );
}
