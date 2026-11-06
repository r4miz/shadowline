import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { runMonitoringForOrganization } from "@/lib/monitoring";
import { ownedOrganization } from "@/lib/ownership";
import { activateMonitoring, deactivateMonitoring } from "@/lib/quotes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const org = await ownedOrganization(user.id, id);
    if (!org) return notFound();
    const [openAlerts, pendingSignoffs, connections] = await Promise.all([
      prisma.alert.count({ where: { organizationId: id, resolvedAt: null } }),
      prisma.policyAcknowledgement.count({ where: { status: "pending", engagement: { organizationId: id } } }),
      prisma.scanConnection.count({ where: { organizationId: id, status: "active" } }),
    ]);
    return ok({
      monitoringActive: org.monitoringActive,
      monitoringSince: org.monitoringSince,
      nextResurveyAt: org.nextResurveyAt,
      openAlerts,
      pendingSignoffs,
      activeConnections: connections,
      cronConfigured: Boolean(process.env.CRON_SECRET),
    });
  } catch (error) {
    return apiError(error);
  }
}

// Run the monitoring cycle for this company now.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const report = await runMonitoringForOrganization(id);
    return ok(report);
  } catch (error) {
    return apiError(error);
  }
}

const ToggleSchema = z.object({ active: z.boolean() });

// Manually start or stop monitoring (used when billing happens outside Stripe).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const { active } = ToggleSchema.parse(await request.json().catch(() => null));
    const org = active ? await activateMonitoring(id) : await deactivateMonitoring(id);
    return ok({ monitoringActive: org.monitoringActive, nextResurveyAt: org.nextResurveyAt });
  } catch (error) {
    return apiError(error);
  }
}
