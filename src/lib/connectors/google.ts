/**
 * Google Workspace connector (read-only). A Workspace admin completes a
 * standard OAuth consent; we store only the encrypted refresh token.
 *
 * APIs used (all GET):
 *   Directory users.list     https://admin.googleapis.com/admin/directory/v1/users
 *   Directory tokens.list    https://admin.googleapis.com/admin/directory/v1/users/{userKey}/tokens
 * Scopes: admin.directory.user.readonly, admin.directory.user.security, openid, email.
 */
import { ConnectorError, type ConnectorResult, type WorkspaceUser } from "./types";
import type { RawDiscoveredApp } from "./classify";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.user.security",
];

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new ConnectorError("Google token request failed", res.status);
  return (await res.json()) as TokenResponse;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const tok = await tokenRequest({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  if (!tok.refresh_token) {
    throw new ConnectorError("Google did not return a refresh token; the admin must approve offline access");
  }
  const who = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tok.access_token}` },
  });
  const info = who.ok ? ((await who.json()) as { email?: string; hd?: string }) : {};
  return {
    refreshToken: tok.refresh_token,
    adminEmail: info.email ?? null,
    domain: info.hd ?? null,
    scopes: tok.scope?.split(" ") ?? GOOGLE_SCOPES,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const tok = await tokenRequest({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
  });
  return tok.access_token;
}

async function gget<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (res.status === 401 || res.status === 403) {
    throw new ConnectorError("Google access was revoked or lacks admin privileges", res.status);
  }
  if (!res.ok) throw new ConnectorError(`Google API error ${res.status}`, res.status);
  return (await res.json()) as T;
}

interface GUser {
  id: string;
  primaryEmail: string;
  creationTime?: string;
  suspended?: boolean;
}
interface GToken {
  clientId: string;
  displayText?: string;
  scopes?: string[];
  nativeApp?: boolean;
  anonymous?: boolean;
}

const FIRST_PARTY = /^(google|chrome|android|ios|gmail|youtube|workspace)\b/i;

export async function listGoogleUsers(accessToken: string): Promise<WorkspaceUser[]> {
  const users: WorkspaceUser[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      customer: "my_customer",
      maxResults: "500",
      fields: "nextPageToken,users(id,primaryEmail,creationTime,suspended)",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await gget<{ users?: GUser[]; nextPageToken?: string }>(
      accessToken,
      `https://admin.googleapis.com/admin/directory/v1/users?${params}`
    );
    for (const u of page.users ?? []) {
      users.push({ id: u.id, email: u.primaryEmail, createdAt: u.creationTime ?? null, suspended: Boolean(u.suspended) });
    }
    pageToken = page.nextPageToken;
  } while (pageToken && users.length < 5000);
  return users;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function fetchGoogleWorkspace(refreshToken: string): Promise<ConnectorResult> {
  const accessToken = await refreshGoogleAccessToken(refreshToken);
  const users = await listGoogleUsers(accessToken);
  const warnings: string[] = [];

  const perUser = await mapLimit(users.filter((u) => !u.suspended), 6, async (u) => {
    try {
      const res = await gget<{ items?: GToken[] }>(
        accessToken,
        `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(u.id)}/tokens`
      );
      return { user: u, tokens: res.items ?? [] };
    } catch {
      warnings.push(`Could not read connected apps for one user`);
      return { user: u, tokens: [] as GToken[] };
    }
  });

  const apps = new Map<string, RawDiscoveredApp>();
  for (const { user, tokens } of perUser) {
    for (const t of tokens) {
      const name = t.displayText?.trim() || t.clientId;
      const app =
        apps.get(t.clientId) ??
        ({ externalId: t.clientId, name, publisher: null, scopes: [], users: [], firstParty: FIRST_PARTY.test(name) } satisfies RawDiscoveredApp);
      for (const s of t.scopes ?? []) if (!app.scopes.includes(s)) app.scopes.push(s);
      if (!app.users.includes(user.email)) app.users.push(user.email);
      apps.set(t.clientId, app);
    }
  }

  return { apps: [...apps.values()], users, builtInAi: null, warnings };
}
