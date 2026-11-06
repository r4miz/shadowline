/**
 * Server-side loader for the company workspace: the organization, its current
 * audit, and which stages have evidence. Used by the layout and overview page.
 */
import { prisma } from "@/lib/db";
import { currentEngagement } from "@/lib/ownership";

export type StageKey =
  | "overview"
  | "profile"
  | "scan"
  | "survey"
  | "expenses"
  | "inventory"
  | "findings"
  | "recommendation"
  | "documents"
  | "signoff"
  | "monitoring"
  | "billing";

export const STAGES: Array<{ key: StageKey; label: string; short: string }> = [
  { key: "overview", label: "Overview", short: "Overview" },
  { key: "profile", label: "Company profile", short: "Profile" },
  { key: "scan", label: "Workspace scan", short: "Scan" },
  { key: "survey", label: "Employee survey", short: "Survey" },
  { key: "expenses", label: "Expense scan", short: "Expenses" },
  { key: "inventory", label: "AI tool inventory", short: "Inventory" },
  { key: "findings", label: "Risk findings", short: "Findings" },
  { key: "recommendation", label: "Platform recommendation", short: "Recommendation" },
  { key: "documents", label: "Documents", short: "Documents" },
  { key: "signoff", label: "Policy sign-off", short: "Sign-off" },
  { key: "monitoring", label: "Monitoring", short: "Monitoring" },
  { key: "billing", label: "Quotes and billing", short: "Billing" },
];

export async function loadCompanyContext(userId: string, organizationId: string) {
  const org = await prisma.organization.findFirst({
    where: { id: organizationId, consultantId: userId },
    include: { profile: true },
  });
  if (!org) return null;
  const engagement = await currentEngagement(org.id);

  const [counts, scanCount, expenseCount, publishedPolicy, acks, openAlerts, paidQuotes, history] = await Promise.all([
    prisma.engagement.findUniqueOrThrow({
      where: { id: engagement.id },
      select: { _count: { select: { responses: true, aiTools: true, riskFindings: true, documents: true } } },
    }),
    prisma.scan.count({ where: { organizationId: org.id, status: "complete" } }),
    prisma.expenseMatch.count({ where: { engagementId: engagement.id } }),
    prisma.policyDocument.findFirst({ where: { engagementId: engagement.id, type: "aup", publishedAt: { not: null } }, select: { id: true } }),
    prisma.policyAcknowledgement.groupBy({ by: ["status"], where: { engagementId: engagement.id }, _count: true }),
    prisma.alert.count({ where: { organizationId: org.id, resolvedAt: null } }),
    prisma.quote.count({ where: { organizationId: org.id, status: "paid" } }),
    prisma.engagement.findMany({ where: { organizationId: org.id }, orderBy: { startedAt: "desc" }, select: { id: true, kind: true, status: true, startedAt: true, completedAt: true } }),
  ]);

  const respondents = await prisma.response.groupBy({ by: ["respondentToken"], where: { engagementId: engagement.id, question: { audience: "employee" } } });
  const signed = acks.find((a) => a.status === "signed")?._count ?? 0;
  const pending = acks.find((a) => a.status === "pending")?._count ?? 0;

  const done: Record<StageKey, boolean> = {
    overview: true,
    profile: Boolean(org.profile && org.profile.suite !== "unknown"),
    scan: scanCount > 0,
    survey: respondents.length > 0,
    expenses: expenseCount > 0,
    inventory: counts._count.aiTools > 0,
    findings: counts._count.riskFindings > 0,
    recommendation: Boolean(org.profile && org.profile.suite !== "unknown"),
    documents: counts._count.documents > 0,
    signoff: Boolean(publishedPolicy) && signed > 0,
    monitoring: org.monitoringActive,
    billing: paidQuotes > 0,
  };

  return {
    org,
    engagement,
    done,
    stats: {
      responses: counts._count.responses,
      respondents: respondents.length,
      tools: counts._count.aiTools,
      findings: counts._count.riskFindings,
      documents: counts._count.documents,
      scans: scanCount,
      expenseMatches: expenseCount,
      signed,
      pendingSignoffs: pending,
      openAlerts,
      paidQuotes,
      policyPublished: Boolean(publishedPolicy),
    },
    history,
  };
}

export type CompanyContext = NonNullable<Awaited<ReturnType<typeof loadCompanyContext>>>;
