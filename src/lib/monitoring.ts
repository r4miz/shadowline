/**
 * Monitoring cycle for subscribed companies. Called by the daily cron route and
 * by the "Run now" button. Each step is independent so one failure does not
 * stop the others.
 */
import { prisma } from "@/lib/db";
import { runScan } from "@/lib/connectors/run-scan";
import { sendEmail, simpleHtml } from "@/lib/email";
import { brand } from "@/lib/brand";

const RESURVEY_INTERVAL_DAYS = 90;
const SIGNOFF_OVERDUE_DAYS = 14;

export interface CycleReport {
  organizationId: string;
  scans: number;
  scanErrors: number;
  resurveyCreated: boolean;
  overdueSignoffs: number;
  newAlerts: number;
}

export function nextResurveyDate(from: Date): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + RESURVEY_INTERVAL_DAYS);
  return d;
}

export async function runMonitoringForOrganization(organizationId: string, now = new Date()): Promise<CycleReport> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      connections: { where: { status: { not: "revoked" } } },
      engagements: { orderBy: { startedAt: "desc" }, take: 1, select: { id: true, status: true } },
    },
  });
  if (!org) throw new Error("Organization not found");
  const report: CycleReport = { organizationId, scans: 0, scanErrors: 0, resurveyCreated: false, overdueSignoffs: 0, newAlerts: 0 };
  const alertsBefore = await prisma.alert.count({ where: { organizationId, resolvedAt: null } });
  const currentEngagementId = org.engagements[0]?.id ?? null;

  for (const connection of org.connections) {
    try {
      await runScan(connection.id, currentEngagementId);
      report.scans += 1;
    } catch {
      report.scanErrors += 1;
    }
  }

  if (org.monitoringActive && org.nextResurveyAt && org.nextResurveyAt <= now) {
    const previous = await prisma.engagement.findFirst({
      where: { organizationId },
      orderBy: { startedAt: "desc" },
      include: { aiTools: { where: { sanctioned: true } } },
    });
    const fresh = await prisma.engagement.create({
      data: { organizationId, kind: "resurvey", status: "draft" },
    });
    if (previous?.aiTools.length) {
      await prisma.aITool.createMany({
        data: previous.aiTools.map((t) => ({
          engagementId: fresh.id,
          name: t.name,
          vendor: t.vendor,
          category: t.category,
          dataExposureLevel: t.dataExposureLevel,
          sanctioned: true,
          accessMethod: t.accessMethod,
          notes: t.notes,
          source: "manual" as const,
          catalogKey: t.catalogKey,
        })),
      });
    }
    await prisma.organization.update({ where: { id: organizationId }, data: { nextResurveyAt: nextResurveyDate(now) } });
    await prisma.alert.create({
      data: {
        organizationId,
        type: "resurvey_due",
        severity: "info",
        title: "Quarterly re-survey is ready",
        body: "A new audit was created for this quarter. Generate a survey link and send it to staff.",
        data: { engagementId: fresh.id },
      },
    });
    report.resurveyCreated = true;
  }

  const overdueSince = new Date(now);
  overdueSince.setUTCDate(overdueSince.getUTCDate() - SIGNOFF_OVERDUE_DAYS);
  const overdue = await prisma.policyAcknowledgement.count({
    where: { status: "pending", invitedAt: { lt: overdueSince }, engagement: { organizationId } },
  });
  report.overdueSignoffs = overdue;
  if (overdue > 0) {
    const open = await prisma.alert.findFirst({ where: { organizationId, type: "signoff_overdue", resolvedAt: null } });
    if (!open) {
      await prisma.alert.create({
        data: {
          organizationId,
          type: "signoff_overdue",
          severity: "warning",
          title: `${overdue} policy sign-off${overdue === 1 ? "" : "s"} overdue`,
          body: `${overdue} employee${overdue === 1 ? " has" : "s have"} not signed the AI policy after ${SIGNOFF_OVERDUE_DAYS} days.`,
        },
      });
    }
  }

  const alertsAfter = await prisma.alert.count({ where: { organizationId, resolvedAt: null } });
  report.newAlerts = Math.max(0, alertsAfter - alertsBefore);
  return report;
}

/** Run every monitored company and email the operator a digest of new alerts. */
export async function runMonitoringCycle(now = new Date()) {
  const orgs = await prisma.organization.findMany({
    where: { monitoringActive: true },
    select: { id: true, name: true, consultant: { select: { email: true, name: true } } },
  });
  const reports: Array<CycleReport & { name: string }> = [];
  const digest = new Map<string, string[]>();
  for (const org of orgs) {
    try {
      const r = await runMonitoringForOrganization(org.id, now);
      reports.push({ ...r, name: org.name });
      if (r.newAlerts > 0 || r.resurveyCreated || r.scanErrors > 0) {
        const lines = digest.get(org.consultant.email) ?? [];
        lines.push(
          `${org.name}: ${r.newAlerts} new alert${r.newAlerts === 1 ? "" : "s"}${r.resurveyCreated ? ", quarterly re-survey created" : ""}${r.scanErrors ? `, ${r.scanErrors} scan error${r.scanErrors === 1 ? "" : "s"}` : ""}`
        );
        digest.set(org.consultant.email, lines);
      }
    } catch (error) {
      console.error(`[monitoring] ${org.id} failed:`, error instanceof Error ? error.message : "unknown");
    }
  }
  for (const [email, lines] of digest) {
    await sendEmail({
      to: email,
      subject: `${brand.name} monitoring: ${lines.length} compan${lines.length === 1 ? "y" : "ies"} need attention`,
      text: lines.join("\n"),
      html: simpleHtml("Monitoring digest", lines, { label: "Open the workshop", url: `${process.env.NEXT_PUBLIC_APP_URL}/app` }),
    });
  }
  return reports;
}
