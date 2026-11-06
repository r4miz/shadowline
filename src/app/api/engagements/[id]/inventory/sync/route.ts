import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { syncInventory } from "@/lib/inventory/sync";
import { ownedEngagement } from "@/lib/ownership";

// Rebuild the AI tool inventory from survey + scan + expense evidence.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    return ok(await syncInventory(id));
  } catch (error) {
    return apiError(error);
  }
}
