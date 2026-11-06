import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { createDemoConnection, demoScansEnabled, latestScanForOrganization, runScan } from "@/lib/connectors/run-scan";
import { googleConfigured } from "@/lib/connectors/google";
import { microsoftConfigured } from "@/lib/connectors/microsoft";
import { currentEngagement, ownedOrganization } from "@/lib/ownership";

// GET: latest completed scan + connection list. POST: run a scan now.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const [scan, connections, history] = await Promise.all([
      latestScanForOrganization(id),
      prisma.scanConnection.findMany({
        where: { organizationId: id },
        select: { id: true, provider: true, adminEmail: true, status: true, lastScanAt: true, lastError: true, createdAt: true, scopes: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.scan.findMany({
        where: { organizationId: id },
        orderBy: { startedAt: "desc" },
        take: 12,
        select: { id: true, provider: true, status: true, startedAt: true, finishedAt: true, userCount: true, appCount: true, aiAppCount: true, error: true },
      }),
    ]);
    return ok({
      scan,
      connections,
      history,
      providers: { google: googleConfigured(), microsoft: microsoftConfigured(), demo: demoScansEnabled() },
    });
  } catch (error) {
    return apiError(error);
  }
}

const RunSchema = z.object({
  connectionId: z.string().min(1).optional(),
  demo: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedOrganization(user.id, id))) return notFound();
    const body = RunSchema.parse(await request.json().catch(() => ({})));
    const engagement = await currentEngagement(id);

    let connectionIds: string[] = [];
    if (body.demo) {
      if (!demoScansEnabled()) {
        return NextResponse.json({ success: false, error: "demo_disabled" }, { status: 400 });
      }
      const existing = await prisma.scanConnection.findFirst({ where: { organizationId: id, provider: "demo" } });
      connectionIds = [existing?.id ?? (await createDemoConnection(id)).id];
    } else if (body.connectionId) {
      const c = await prisma.scanConnection.findFirst({ where: { id: body.connectionId, organizationId: id } });
      if (!c) return notFound();
      connectionIds = [c.id];
    } else {
      const all = await prisma.scanConnection.findMany({ where: { organizationId: id, status: { not: "revoked" } }, select: { id: true } });
      connectionIds = all.map((c) => c.id);
    }
    if (connectionIds.length === 0) {
      return NextResponse.json({ success: false, error: "no_connections" }, { status: 400 });
    }

    const results: Array<{ connectionId: string; ok: boolean; error?: string }> = [];
    for (const connectionId of connectionIds) {
      try {
        await runScan(connectionId, engagement.id);
        results.push({ connectionId, ok: true });
      } catch (error) {
        results.push({ connectionId, ok: false, error: error instanceof Error ? error.message : "Scan failed" });
      }
    }
    return ok({ results, scan: await latestScanForOrganization(id) });
  } catch (error) {
    return apiError(error);
  }
}
