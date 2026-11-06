import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { generateDocuments } from "@/lib/documents";
import { regenerateFindings } from "@/lib/findings";
import { syncInventory } from "@/lib/inventory/sync";
import { ownedEngagement } from "@/lib/ownership";

// "Build the audit": inventory -> findings -> documents, in order. Manual
// edits to tools and findings are preserved by the underlying functions.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    const tools = await syncInventory(id);
    const findings = await regenerateFindings(id);
    const documents = await generateDocuments(id);
    return ok({ tools: tools.length, findings: findings.length, documents: documents.length });
  } catch (error) {
    return apiError(error);
  }
}
