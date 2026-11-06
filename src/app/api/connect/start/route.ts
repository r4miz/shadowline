import { NextResponse } from "next/server";
import { apiError, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { googleAuthUrl, googleConfigured } from "@/lib/connectors/google";
import { microsoftAdminConsentUrl, microsoftConfigured } from "@/lib/connectors/microsoft";
import { setNonceCookie } from "@/lib/connectors/oauth-state";
import { createDemoConnection, demoScansEnabled, runScan } from "@/lib/connectors/run-scan";
import { requestOrigin } from "@/lib/ownership";
import { enforceRateLimit } from "@/lib/rate-limit";
import { signOAuthState, verifyConnectToken } from "@/lib/tokens";
import { ConnectStartSchema } from "@/lib/validation";

// Public, token-gated: begin an OAuth / admin-consent flow for the provider.
// The OAuth `state` is a separate short-lived, single-use signed token bound to
// the organization, the provider and (via cookie) this browser.
export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, "connect-start", 10, 60 * 1000);
    if (limited) return limited;
    const body = ConnectStartSchema.parse(await request.json().catch(() => null));
    let organizationId: string;
    try {
      ({ organizationId } = await verifyConnectToken(body.token));
    } catch {
      return NextResponse.json({ success: false, error: "invalid_or_expired" }, { status: 401 });
    }
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!org) return NextResponse.json({ success: false, error: "invalid_or_expired" }, { status: 401 });

    const origin = requestOrigin(request);

    if (body.provider === "demo") {
      if (!demoScansEnabled()) return NextResponse.json({ success: false, error: "demo_disabled" }, { status: 400 });
      const existing = await prisma.scanConnection.findFirst({ where: { organizationId, provider: "demo" } });
      const connection = existing ?? (await createDemoConnection(organizationId));
      const engagement = await prisma.engagement.findFirst({ where: { organizationId }, orderBy: { startedAt: "desc" }, select: { id: true } });
      await runScan(connection.id, engagement?.id ?? null);
      return ok({ redirect: `${origin}/connect/done?provider=demo` });
    }

    if (body.provider === "google") {
      if (!googleConfigured()) return NextResponse.json({ success: false, error: "provider_unavailable" }, { status: 400 });
      const { state, nonce } = await signOAuthState({ organizationId, provider: "google" });
      return setNonceCookie(ok({ redirect: googleAuthUrl(state, `${origin}/api/connect/google/callback`) }), nonce);
    }

    if (!microsoftConfigured()) return NextResponse.json({ success: false, error: "provider_unavailable" }, { status: 400 });
    const { state, nonce } = await signOAuthState({ organizationId, provider: "microsoft" });
    return setNonceCookie(ok({ redirect: microsoftAdminConsentUrl(state, `${origin}/api/connect/microsoft/callback`) }), nonce);
  } catch (error) {
    return apiError(error);
  }
}
