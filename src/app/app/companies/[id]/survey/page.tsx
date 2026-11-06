import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { SurveyLinkButton } from "@/components/survey/survey-link-button";
import { SurveySummary } from "@/components/company/survey-summary";
import { ItDeepDive } from "@/components/company/it-deep-dive";

export const metadata = { title: "Employee survey" };

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Stage 3"
        title="Employee survey"
        description="Thirteen plain-English questions about how staff really use AI. Anonymous, five minutes, no login. Answers are encrypted and only ever shown as totals."
        actions={<SurveyLinkButton engagementId={ctx.engagement.id} />}
      />
      <SurveySummary engagementId={ctx.engagement.id} employeeCount={ctx.org.employeeCount} />
      <ItDeepDive engagementId={ctx.engagement.id} />
    </div>
  );
}
