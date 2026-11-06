/**
 * Microsoft 365 connector (read-only, app-only). A tenant admin grants consent
 * once via the admin-consent endpoint; afterwards we authenticate with client
 * credentials for that tenant. We store only the encrypted tenant id.
 *
 * Graph (v1.0) calls, all GET:
 *   /users                      user list (new-hire detection, grant resolution)
 *   /servicePrincipals          app names and publishers
 *   /oauth2PermissionGrants     delegated permissions users consented to
 *   /reports/getMicrosoft365CopilotUsageUserDetail(period='D30')   optional
 * Application permissions: Directory.Read.All, Reports.Read.All (optional).
 */
import { ConnectorError, type BuiltInAiUsage, type ConnectorResult, type WorkspaceUser } from "./types";
import type { RawDiscoveredApp } from "./classify";

const GRAPH = "https://graph.microsoft.com/v1.0";
// Microsoft's own first-party application owner tenants.
const MICROSOFT_TENANTS = new Set([
  "f8cdef31-a31e-4b4a-93e4-5f571e91255a",
  "72f988bf-86f1-41af-91ab-2d7cd011db47",
]);

export function microsoftConfigured(): boolean {
  return Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
}

export function microsoftAdminConsentUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope: "https://graph.microsoft.com/.default",
    state,
  });
  return `https://login.microsoftonline.com/organizations/v2.0/adminconsent?${params}`;
}

export async function getMicrosoftAppToken(tenantId: string): Promise<string> {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) throw new ConnectorError("Invalid tenant id");
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID ?? "",
      client_secret: process.env.MS_CLIENT_SECRET ?? "",
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new ConnectorError("Microsoft token request failed; consent may have been revoked", res.status);
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

async function graphAll<T>(token: string, url: string, max = 5000): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  while (next && out.length < max) {
    const res: Response = await fetch(next, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json", ConsistencyLevel: "eventual" },
    });
    if (res.status === 401 || res.status === 403) {
      throw new ConnectorError("Microsoft access was revoked or lacks the required permissions", res.status);
    }
    if (!res.ok) throw new ConnectorError(`Microsoft Graph error ${res.status}`, res.status);
    const page = (await res.json()) as { value?: T[]; "@odata.nextLink"?: string };
    out.push(...(page.value ?? []));
    next = page["@odata.nextLink"];
  }
  return out;
}

interface MsUser {
  id: string;
  mail?: string | null;
  userPrincipalName: string;
  createdDateTime?: string;
  accountEnabled?: boolean;
}
interface MsSp {
  id: string;
  appId: string;
  displayName: string;
  publisherName?: string | null;
  appOwnerOrganizationId?: string | null;
  servicePrincipalType?: string;
}
interface MsGrant {
  id: string;
  clientId: string;
  consentType: "AllPrincipals" | "Principal";
  principalId?: string | null;
  scope?: string | null;
}

/** Verified domains of the consenting tenant (used to sanity-check the connection). */
export async function tenantVerifiedDomains(token: string): Promise<string[]> {
  try {
    const orgs = await graphAll<{ verifiedDomains?: Array<{ name: string; isVerified?: boolean }> }>(token, `${GRAPH}/organization?$select=verifiedDomains`, 5);
    return orgs.flatMap((o) => (o.verifiedDomains ?? []).filter((d) => d.isVerified !== false).map((d) => d.name));
  } catch {
    return [];
  }
}

async function copilotUsage(token: string): Promise<BuiltInAiUsage | null> {
  try {
    const res = await fetch(`${GRAPH}/reports/getMicrosoft365CopilotUsageUserDetail(period='D30')`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { value?: Array<{ lastActivityDate?: string | null }> };
    const active = (body.value ?? []).filter((r) => Boolean(r.lastActivityDate)).length;
    return { product: "Microsoft 365 Copilot", activeUsers: active, periodDays: 30 };
  } catch {
    return null;
  }
}

export async function fetchMicrosoft365(tenantId: string): Promise<ConnectorResult> {
  const token = await getMicrosoftAppToken(tenantId);
  const warnings: string[] = [];

  const [rawUsers, sps, grants] = await Promise.all([
    graphAll<MsUser>(token, `${GRAPH}/users?$select=id,mail,userPrincipalName,createdDateTime,accountEnabled&$top=999`),
    graphAll<MsSp>(token, `${GRAPH}/servicePrincipals?$select=id,appId,displayName,publisherName,appOwnerOrganizationId,servicePrincipalType&$top=999`),
    graphAll<MsGrant>(token, `${GRAPH}/oauth2PermissionGrants?$top=999`),
  ]);

  const users: WorkspaceUser[] = rawUsers.map((u) => ({
    id: u.id,
    email: u.mail ?? u.userPrincipalName,
    createdAt: u.createdDateTime ?? null,
    suspended: u.accountEnabled === false,
  }));
  const userById = new Map(users.map((u) => [u.id, u]));
  const spById = new Map(sps.map((s) => [s.id, s]));

  const apps = new Map<string, RawDiscoveredApp>();
  for (const g of grants) {
    const sp = spById.get(g.clientId);
    const name = sp?.displayName ?? g.clientId;
    const firstParty = Boolean(sp?.appOwnerOrganizationId && MICROSOFT_TENANTS.has(sp.appOwnerOrganizationId));
    const app =
      apps.get(g.clientId) ??
      ({
        externalId: sp?.appId ?? g.clientId,
        name,
        publisher: sp?.publisherName ?? null,
        scopes: [],
        users: [],
        firstParty,
      } satisfies RawDiscoveredApp);
    for (const s of (g.scope ?? "").split(/\s+/).filter(Boolean)) if (!app.scopes.includes(s)) app.scopes.push(s);
    if (g.consentType === "AllPrincipals") {
      app.users = users.filter((u) => !u.suspended).map((u) => u.email);
      if (!app.scopes.includes("admin-consented-for-all-users")) app.scopes.push("admin-consented-for-all-users");
    } else if (g.principalId) {
      const u = userById.get(g.principalId);
      if (u && !app.users.includes(u.email)) app.users.push(u.email);
    }
    apps.set(g.clientId, app);
  }

  const builtInAi = await copilotUsage(token);
  if (!builtInAi) warnings.push("Copilot usage report unavailable (needs Reports.Read.All or no Copilot licences)");

  return { apps: [...apps.values()], users, builtInAi, warnings };
}
