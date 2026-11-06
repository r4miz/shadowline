import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {}

// RBAC (spec section 8): every API route resolves the signed-in operator and
// every query filters by their id (`organization.consultantId`). Rows that
// belong to someone else are indistinguishable from rows that do not exist.
export async function requireUser(): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError("Not authenticated");
  return { id: session.user.id };
}

/** @deprecated use requireUser */
export const requireConsultant = requireUser;
