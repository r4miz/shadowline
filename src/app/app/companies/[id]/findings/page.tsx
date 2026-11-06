import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { FindingsPanel } from "@/components/findings/findings-panel";

export const metadata = { title: "Risk findings" };

export default async function FindingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stage 6" title="Risk findings" description="Scored the same way every time: likelihood times impact, banded high, moderate, low. Rewrite the wording in the owner's language before generating documents; your edits survive re-scoring." />
      <FindingsPanel engagementId={ctx.engagement.id} />
    </div>
  );
}
