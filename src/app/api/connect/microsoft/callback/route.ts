import { NextResponse } from "next/server";
import { encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { getMicrosoftAppToken, tenantVerifiedDomains } from "@/lib/connectors/microsoft";
import { checkOAuthState, clearNonceCookie } from "@/lib/connectors/oauth-state";
import { runScan } from "@/lib/connectors/run-scan";
import type { ConnectorCredentials } from "@/lib/connectors/types";
import { requestOrigin } from "@/lib/ownership";

function fail(origin: string, reason: string) {
  return clearNonceCookie(NextResponse.redirect(`${origin}/connect/done?provider=microsoft&error=${encodeURIComponent(reason)}`));
}

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

// Admin-consent callback: ?admin_consent=True&tenant=<id>&state=<signed>
export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant");
  const consented = (url.searchParams.get("admin_consent") ?? "").toLowerCase() === "true";
  if (url.searchParams.get("error") || !consented) return fail(origin, "denied");
  if (!tenant) return fail(origin, "missing");
  if (!/^[0-9a-f-]{36}$/i.test(tenant)) return fail(origin, "tenant");

  const check = await checkOAuthState(request, url.searchParams.get("state"), "microsoft");
  if (!check.ok) return fail(origin, check.reason);

  try {
    // Prove the consent took effect before storing anything, then compare the
    // tenant's verified domains with what we know about the company so an
    // unrelated tenant cannot be attached silently.
    const token = await getMicrosoftAppToken(tenant);
    const domains = await tenantVerifiedDomains(token);
    const org = await prisma.organization.findUnique({ where: { id: check.organizationId }, select: { website: true, contactEmail: true } });
    const known = [domainOf(org?.website ?? null), domainOf(org?.contactEmail ?? null)].filter((d): d is string => Boolean(d));
    // Fail closed: if we could not read the tenant's domains, treat it as unverified.
    const mismatch = known.length > 0 && (domains.length === 0 || !domains.some((d) => known.includes(d.toLowerCase())));

    const connection = await prisma.scanConnection.create({
      data: {
        organizationId: check.organizationId,
        provider: "microsoft",
        externalTenantId: tenant,
        adminEmail: domains[0] ? `admin@${domains[0]}` : null,
        encryptedCredentials: encryptJson({ kind: "microsoft", tenantId: tenant } satisfies ConnectorCredentials),
        scopes: ["Directory.Read.All", "Reports.Read.All"],
        lastError: mismatch ? `Tenant domains (${domains.slice(0, 3).join(", ") || "could not be read"}) do not match the company's contact domain. Confirm with the client before trusting this scan.` : null,
      },
    });
    if (mismatch) {
      await prisma.alert.create({
        data: {
          organizationId: check.organizationId,
          type: "scan_failed",
          severity: "warning",
          title: "Connected Microsoft tenant does not match the company domain",
          body: `The tenant that granted consent owns ${domains.slice(0, 3).join(", ") || "domains we could not read"}; the company record uses ${known.join(", ")}. Verify before relying on the scan.`,
        },
      });
    }
    const engagement = await prisma.engagement.findFirst({ where: { organizationId: check.organizationId }, orderBy: { startedAt: "desc" }, select: { id: true } });
    await runScan(connection.id, engagement?.id ?? null).catch(() => null);
    return clearNonceCookie(NextResponse.redirect(`${origin}/connect/done?provider=microsoft`));
  } catch {
    return fail(origin, "exchange");
  }
}
