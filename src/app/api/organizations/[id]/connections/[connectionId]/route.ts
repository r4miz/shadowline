import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { ownedOrganization } from "@/lib/ownership";

// Revoke a workspace connection. We mark it revoked and wipe the encrypted
// credential so nothing can be decrypted later, keeping scan history intact.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const user = await requireUser();
    const { id, connectionId } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const { count } = await prisma.scanConnection.updateMany({
      where: { id: connectionId, organizationId: id },
      data: { status: "revoked", encryptedCredentials: "", lastError: null },
    });
    if (count === 0) return notFound();
    return ok({ revoked: true });
  } catch (error) {
    return apiError(error);
  }
}
