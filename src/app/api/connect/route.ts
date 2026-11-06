import { NextResponse } from "next/server";
import { apiError, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { googleConfigured } from "@/lib/connectors/google";
import { microsoftConfigured } from "@/lib/connectors/microsoft";
import { demoScansEnabled } from "@/lib/connectors/run-scan";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyConnectToken } from "@/lib/tokens";

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain) return null;
  return `${user.slice(0, 1)}***@${domain}`;
}

// Public, token-gated: what the client admin sees on the connect page.
export async function GET(request: Request) {
  try {
    const limited = enforceRateLimit(request, "connect-info", 30, 60 * 1000);
    if (limited) return limited;
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return NextResponse.json({ success: false, error: "invalid_or_expired" }, { status: 401 });
    let organizationId: string;
    try {
      ({ organizationId } = await verifyConnectToken(token));
    } catch {
      return NextResponse.json({ success: false, error: "invalid_or_expired" }, { status: 401 });
    }
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, consultant: { select: { name: true } }, connections: { where: { status: "active" }, select: { provider: true, adminEmail: true, lastScanAt: true } } },
    });
    if (!org) return NextResponse.json({ success: false, error: "invalid_or_expired" }, { status: 401 });
    return ok({
      organizationName: org.name,
      operatorName: org.consultant.name,
      providers: { google: googleConfigured(), microsoft: microsoftConfigured(), demo: demoScansEnabled() },
      existing: org.connections.map((c) => ({ provider: c.provider, lastScanAt: c.lastScanAt, adminEmail: maskEmail(c.adminEmail) })),
    });
  } catch (error) {
    return apiError(error);
  }
}
