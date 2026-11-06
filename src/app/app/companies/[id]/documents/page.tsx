import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { DocumentsPanel } from "@/components/documents/documents-panel";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Stage 8" title="Documents" description="Generated from everything above. Each regeneration bumps the version; the policy you publish for sign-off is pinned to its version." />
      <DocumentsPanel engagementId={ctx.engagement.id} />
    </div>
  );
}
