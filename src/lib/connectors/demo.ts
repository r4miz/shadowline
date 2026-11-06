/**
 * Demo connector: a realistic, deterministic workspace for sales demos and
 * development. All names and addresses are fictional. The `seed` string makes
 * two runs for the same company produce the same data, with a small "drift" so
 * monitoring can demonstrate a new-app alert on later runs.
 */
import type { ConnectorResult, WorkspaceUser } from "./types";
import type { RawDiscoveredApp } from "./classify";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FIRST = ["ava", "ben", "chloe", "dan", "ella", "finn", "grace", "hugo", "iris", "jack", "kate", "liam", "maya", "noah", "olive", "paul", "quinn", "rosa", "sam", "tess", "uma", "vik", "wren", "xavi", "yara", "zane"];

export function demoUsers(seed: string, count: number, domain: string): WorkspaceUser[] {
  const base = hash(seed);
  return Array.from({ length: count }, (_, i) => {
    const name = FIRST[(base + i) % FIRST.length];
    const created = new Date(Date.UTC(2024, (base + i) % 12, 1 + ((base >> 3) + i) % 27));
    return { id: `demo-${i}`, email: `${name}${i > 25 ? i : ""}@${domain}`, createdAt: created.toISOString(), suspended: false };
  });
}

export function demoWorkspace(seed: string, employeeCount: number, runIndex = 0): ConnectorResult {
  const domain = "example-client.com";
  const users = demoUsers(seed, Math.max(3, Math.min(employeeCount, 60)), domain);
  const pick = (n: number, offset: number) => users.slice(offset % users.length, (offset % users.length) + n).map((u) => u.email);

  const apps: RawDiscoveredApp[] = [
    { externalId: "demo-chatgpt", name: "ChatGPT", publisher: "OpenAI", scopes: ["openid", "email", "profile"], users: pick(Math.max(2, Math.round(users.length * 0.45)), 0) },
    { externalId: "demo-otter", name: "Otter.ai", publisher: "AISense Inc", scopes: ["calendar.readonly", "openid", "email"], users: pick(3, 2) },
    { externalId: "demo-readai", name: "Read AI Meeting Notes", publisher: "Read AI", scopes: ["calendar", "onlinemeetings.read", "openid"], users: pick(2, 5) },
    { externalId: "demo-grammarly", name: "Grammarly", publisher: "Grammarly Inc", scopes: ["openid", "email"], users: pick(Math.max(1, Math.round(users.length * 0.3)), 1) },
    { externalId: "demo-claude", name: "Claude", publisher: "Anthropic", scopes: ["openid", "email"], users: pick(2, 7) },
    { externalId: "demo-perplexity", name: "Perplexity", publisher: "Perplexity AI", scopes: ["openid", "email"], users: pick(1, 9) },
    { externalId: "demo-mailmerge", name: "Mail Merge Pro", publisher: "Example Add-ons", scopes: ["gmail.send", "contacts.readonly", "spreadsheets"], users: pick(2, 3) },
    { externalId: "demo-zoom", name: "Zoom", publisher: "Zoom Video Communications", scopes: ["calendar", "openid", "email"], users: pick(users.length, 0) },
    { externalId: "demo-canva", name: "Canva", publisher: "Canva Pty Ltd", scopes: ["openid", "email", "drive.file"], users: pick(4, 4) },
    { externalId: "demo-docusign", name: "DocuSign", publisher: "DocuSign Inc", scopes: ["openid", "email", "drive.file"], users: pick(2, 6) },
    { externalId: "demo-slack", name: "Slack", publisher: "Slack Technologies", scopes: ["openid", "email", "calendar.readonly"], users: pick(users.length, 0) },
    { externalId: "demo-notion", name: "Notion", publisher: "Notion Labs", scopes: ["openid", "email", "drive.readonly"], users: pick(5, 8) },
    { externalId: "demo-aisidebar", name: "AI Sidebar for Chrome", publisher: null, scopes: ["gmail.readonly", "drive.readonly", "openid"], users: pick(1, 11) },
    { externalId: "demo-chrome", name: "Google Chrome", publisher: "Google", scopes: ["openid"], users: pick(users.length, 0), firstParty: true },
  ];
  if (runIndex >= 1) {
    apps.push({ externalId: "demo-fireflies", name: "Fireflies.ai", publisher: "Fireflies", scopes: ["calendar", "openid", "email", "onlinemeetings.read"], users: pick(2, 12) });
  }
  if (runIndex >= 1) {
    users.push({ id: `demo-new-${runIndex}`, email: `newhire${runIndex}@${domain}`, createdAt: new Date().toISOString(), suspended: false });
  }

  return {
    apps,
    users,
    builtInAi: { product: "Gemini in Workspace", activeUsers: Math.round(users.length * 0.2), periodDays: 30 },
    warnings: ["Demo data: fictional company, fictional people."],
  };
}
