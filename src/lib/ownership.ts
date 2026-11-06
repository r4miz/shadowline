/**
 * Ownership helpers used by every authenticated route. A row that belongs to
 * someone else is reported exactly like a row that does not exist.
 */
import { prisma } from "@/lib/db";

export async function ownedOrganization(userId: string, organizationId: string) {
  return prisma.organization.findFirst({
    where: { id: organizationId, consultantId: userId },
  });
}

export async function ownedEngagement(userId: string, engagementId: string) {
  return prisma.engagement.findFirst({
    where: { id: engagementId, organization: { consultantId: userId } },
    include: { organization: { select: { id: true, name: true, employeeCount: true } } },
  });
}

/** The current (latest) audit for a company, created on demand. */
export async function currentEngagement(organizationId: string) {
  const existing = await prisma.engagement.findFirst({
    where: { organizationId },
    orderBy: { startedAt: "desc" },
  });
  if (existing) return existing;
  return prisma.engagement.create({ data: { organizationId } });
}

export function requestOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  // Never derive redirect targets from the Host header in production.
  if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL is required");
  return new URL(request.url).origin;
}
