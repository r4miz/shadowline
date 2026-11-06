import { NextResponse } from "next/server";
import { encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { exchangeGoogleCode } from "@/lib/connectors/google";
import { checkOAuthState, clearNonceCookie } from "@/lib/connectors/oauth-state";
import { runScan } from "@/lib/connectors/run-scan";
import type { ConnectorCredentials } from "@/lib/connectors/types";
import { requestOrigin } from "@/lib/ownership";

function domainOf(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v.includes("@")) return v.split("@")[1] ?? null;
  try {
    return new URL(v.startsWith("http") ? v : `https://${v}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function fail(origin: string, reason: string) {
  return clearNonceCookie(NextResponse.redirect(`${origin}/connect/done?provider=google&error=${encodeURIComponent(reason)}`));
}

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return fail(origin, "denied");
  if (!code) return fail(origin, "missing");

  const check = await checkOAuthState(request, url.searchParams.get("state"), "google");
  if (!check.ok) return fail(origin, check.reason);

  try {
    const result = await exchangeGoogleCode(code, `${origin}/api/connect/google/callback`);
    // Compare the consenting workspace's domain with what we know about the
    // company so a forwarded connect link cannot silently attach a stranger's workspace.
    const org = await prisma.organization.findUnique({ where: { id: check.organizationId }, select: { website: true, contactEmail: true } });
    const known = [domainOf(org?.website ?? null), domainOf(org?.contactEmail ?? null)].filter((d): d is string => Boolean(d));
    const seen = [result.domain, domainOf(result.adminEmail)].filter((d): d is string => Boolean(d)).map((d) => d.toLowerCase());
    const mismatch = known.length > 0 && (seen.length === 0 || !seen.some((d) => known.includes(d)));
    const connection = await prisma.scanConnection.create({
      data: {
        organizationId: check.organizationId,
        provider: "google",
        adminEmail: result.adminEmail,
        externalTenantId: result.domain,
        encryptedCredentials: encryptJson({ kind: "google", refreshToken: result.refreshToken } satisfies ConnectorCredentials),
        scopes: result.scopes,
        lastError: mismatch ? `Workspace domain (${seen.join(", ") || "unknown"}) does not match the company's contact domain (${known.join(", ")}). Confirm with the client before trusting this scan.` : null,
      },
    });
    if (mismatch) {
      await prisma.alert.create({
        data: {
          organizationId: check.organizationId,
          type: "scan_failed",
          severity: "warning",
          title: "Connected Google Workspace does not match the company domain",
          body: `The workspace that granted access uses ${seen.join(", ") || "an unknown domain"}; the company record uses ${known.join(", ")}. Verify before relying on the scan.`,
        },
      });
    }
    const engagement = await prisma.engagement.findFirst({ where: { organizationId: check.organizationId }, orderBy: { startedAt: "desc" }, select: { id: true } });
    // First scan runs inline so the admin sees a result; failures are recorded on the connection.
    await runScan(connection.id, engagement?.id ?? null).catch(() => null);
    return clearNonceCookie(NextResponse.redirect(`${origin}/connect/done?provider=google`));
  } catch {
    return fail(origin, "exchange");
  }
}
