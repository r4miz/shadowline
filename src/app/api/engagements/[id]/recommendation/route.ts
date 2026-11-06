import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { buildRecommendation } from "@/lib/documents";
import { ownedEngagement } from "@/lib/ownership";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    return ok(await buildRecommendation(id));
  } catch (error) {
    return apiError(error);
  }
}
