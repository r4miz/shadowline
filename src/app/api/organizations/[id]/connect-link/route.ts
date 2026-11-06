import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { ownedOrganization, requestOrigin } from "@/lib/ownership";
import { signConnectToken } from "@/lib/tokens";

// Mint a link the client's workspace admin opens to grant read-only access.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const token = await signConnectToken({ organizationId: id });
    return ok({ url: `${requestOrigin(request)}/connect/${token}`, expiresInDays: 7 }, 201);
  } catch (error) {
    return apiError(error);
  }
}
