import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { loadSurveyAggregates } from "@/lib/inventory/sync";
import { ownedEngagement } from "@/lib/ownership";

// Aggregate, anonymous survey statistics for the operator. Never individual answers.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    return ok(await loadSurveyAggregates(id));
  } catch (error) {
    return apiError(error);
  }
}
