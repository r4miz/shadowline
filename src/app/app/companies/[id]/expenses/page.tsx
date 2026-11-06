import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadCompanyContext } from "@/lib/company-context";
import { PageHeader } from "@/components/app/primitives";
import { ExpensesPanel } from "@/components/company/expenses-panel";

export const metadata = { title: "Expense scan" };

export default async function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const ctx = await loadCompanyContext(session.user.id, id);
  if (!ctx) notFound();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stage 4"
        title="Expense scan"
        description="Upload a card statement or expense export (CSV). We look for AI vendors and keep only the vendor totals. The file itself is never stored."
      />
      <ExpensesPanel engagementId={ctx.engagement.id} />
    </div>
  );
}
