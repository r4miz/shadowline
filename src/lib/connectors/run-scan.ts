/**
 * Scan orchestration: run a connector, classify the results, persist the scan,
 * diff against the previous scan for monitoring alerts, and detect new users.
 * Credentials are decrypted here and only here; they are never logged or
 * returned.
 */
import type { Prisma } from "@prisma/client";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { classifyAll } from "./classify";
import { demoWorkspace } from "./demo";
import { fetchGoogleWorkspace } from "./google";
import { fetchMicrosoft365 } from "./microsoft";
import type { ConnectorCredentials, ConnectorProvider, ConnectorResult } from "./types";

export function demoScansEnabled(): boolean {
  if (process.env.SCAN_DEMO_MODE === "false") return false;
  return process.env.SCAN_DEMO_MODE === "true" || process.env.NODE_ENV !== "production";
}

export async function createDemoConnection(organizationId: string) {
  return prisma.scanConnection.create({
    data: {
      organizationId,
      provider: "demo",
      adminEmail: "admin@example-client.com",
      externalTenantId: "demo",
      encryptedCredentials: encryptJson({ kind: "demo", seed: organizationId } satisfies ConnectorCredentials),
      scopes: ["demo"],
    },
  });
}

async function fetchForConnection(
  provider: ConnectorProvider,
  creds: ConnectorCredentials,
  employeeCount: number,
  runIndex: number
): Promise<ConnectorResult> {
  switch (creds.kind) {
    case "google":
      return fetchGoogleWorkspace(creds.refreshToken);
    case "microsoft":
      return fetchMicrosoft365(creds.tenantId);
    case "demo":
      if (!demoScansEnabled()) throw new Error("Demo scans are disabled");
      return demoWorkspace(creds.seed, employeeCount, runIndex);
    default:
      throw new Error(`Unsupported provider ${provider}`);
  }
}

export async function runScan(connectionId: string, engagementId?: string | null) {
  const connection = await prisma.scanConnection.findUnique({
    where: { id: connectionId },
    include: { organization: { select: { id: true, employeeCount: true } } },
  });
  if (!connection) throw new Error("Connection not found");
  if (connection.status === "revoked") throw new Error("Connection was revoked");

  const previous = await prisma.scan.findFirst({
    where: { organizationId: connection.organizationId, status: "complete" },
    orderBy: { finishedAt: "desc" },
    include: { apps: { select: { externalId: true, isAi: true } } },
  });
  const previousCount = await prisma.scan.count({ where: { connectionId, status: "complete" } });

  const scan = await prisma.scan.create({
    data: {
      organizationId: connection.organizationId,
      engagementId: engagementId ?? null,
      connectionId,
      provider: connection.provider,
    },
  });

  let result: ConnectorResult;
  try {
    const creds = decryptJson<ConnectorCredentials>(connection.encryptedCredentials);
    result = await fetchForConnection(connection.provider, creds, connection.organization.employeeCount, previousCount);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    await prisma.scan.update({ where: { id: scan.id }, data: { status: "failed", finishedAt: new Date(), error: message } });
    await prisma.scanConnection.update({
      where: { id: connectionId },
      data: { lastError: message, status: /revoked|lacks/i.test(message) ? "error" : connection.status },
    });
    await prisma.alert.create({
      data: {
        organizationId: connection.organizationId,
        type: "scan_failed",
        severity: "warning",
        title: "Workspace scan failed",
        body: message,
      },
    });
    throw error;
  }

  const classified = classifyAll(result.apps);
  const aiApps = classified.filter((a) => a.isAi);

  await prisma.$transaction(async (tx) => {
    await tx.discoveredApp.createMany({
      data: classified.map((a) => ({
        scanId: scan.id,
        organizationId: connection.organizationId,
        externalId: a.externalId,
        name: a.name,
        publisher: a.publisher ?? null,
        isAi: a.isAi,
        aiConfidence: a.aiConfidence,
        catalogKey: a.catalogKey,
        category: a.category,
        scopes: a.scopes,
        userCount: a.users.length,
        encryptedUsers: a.users.length ? encryptJson(a.users) : null,
        riskLevel: a.riskLevel,
        riskNotes: a.riskNotes,
      })),
    });
    await tx.scan.update({
      where: { id: scan.id },
      data: {
        status: "complete",
        finishedAt: new Date(),
        userCount: result.users.length,
        appCount: classified.length,
        aiAppCount: aiApps.length,
        summary: {
          builtInAi: result.builtInAi,
          warnings: result.warnings,
          highRiskAi: aiApps.filter((a) => a.riskLevel === "high").length,
        } as Prisma.InputJsonValue,
      },
    });
    await tx.scanConnection.update({
      where: { id: connectionId },
      data: { lastScanAt: new Date(), lastError: null, status: "active" },
    });
  });

  // Monitoring diff: new AI apps and new users since the previous completed scan.
  const alerts: Array<{ type: "new_ai_app" | "new_user"; title: string; body: string; severity: "info" | "warning" | "critical"; data?: object }> = [];
  if (previous) {
    const knownIds = new Set(previous.apps.map((a) => a.externalId));
    for (const a of aiApps) {
      if (knownIds.has(a.externalId)) continue;
      alerts.push({
        type: "new_ai_app",
        severity: a.riskLevel === "high" ? "critical" : "warning",
        title: `New AI app connected: ${a.name}`,
        body: `${a.users.length} work account${a.users.length === 1 ? "" : "s"} connected ${a.name}${a.riskNotes.length ? `. ${a.riskNotes.join(". ")}` : ""}.`,
        data: { externalId: a.externalId, scanId: scan.id },
      });
    }
    const since = previous.finishedAt ?? previous.startedAt;
    const newUsers = result.users.filter((u) => u.createdAt && new Date(u.createdAt) > since && !u.suspended);
    for (let i = 0; i < newUsers.length; i++) {
      alerts.push({
        type: "new_user",
        severity: "info",
        title: "New employee account found",
        body: "A new work account was created since the last scan. A policy sign-off request was queued.",
        data: { scanId: scan.id },
      });
    }
    if (newUsers.length) await queueSignoffForNewUsers(connection.organizationId, newUsers.map((u) => u.email));
  }
  if (alerts.length) {
    await prisma.alert.createMany({
      data: alerts.map((a) => ({ organizationId: connection.organizationId, ...a })),
    });
  }

  return prisma.scan.findUniqueOrThrow({ where: { id: scan.id }, include: { apps: true } });
}

/** New users get a pending acknowledgement on the latest published policy, if any. */
async function queueSignoffForNewUsers(organizationId: string, emails: string[]) {
  const doc = await prisma.policyDocument.findFirst({
    where: { type: "aup", publishedAt: { not: null }, engagement: { organizationId } },
    orderBy: { publishedAt: "desc" },
    select: { id: true, version: true, engagementId: true },
  });
  if (!doc) return;
  for (const email of emails) {
    await prisma.policyAcknowledgement.upsert({
      where: { engagementId_email: { engagementId: doc.engagementId, email: email.toLowerCase() } },
      update: {},
      create: { engagementId: doc.engagementId, documentId: doc.id, documentVersion: doc.version, email: email.toLowerCase() },
    });
  }
}

/** Latest completed scan for an organization with decrypted user lists for the operator view. */
export async function latestScanForOrganization(organizationId: string) {
  const scan = await prisma.scan.findFirst({
    where: { organizationId, status: "complete" },
    orderBy: { finishedAt: "desc" },
    include: { apps: { orderBy: [{ isAi: "desc" }, { riskLevel: "asc" }, { userCount: "desc" }] }, connection: { select: { provider: true, adminEmail: true } } },
  });
  if (!scan) return null;
  return {
    ...scan,
    apps: scan.apps.map((a) => {
      let users: string[] = [];
      if (a.encryptedUsers) {
        try {
          users = decryptJson<string[]>(a.encryptedUsers);
        } catch {
          users = [];
        }
      }
      const { encryptedUsers: _e, ...rest } = a;
      void _e;
      return { ...rest, users };
    }),
  };
}
