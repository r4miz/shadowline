/* eslint-disable @typescript-eslint/no-explicit-any -- dev script consuming dynamic JSON responses */
// End-to-end test of the operator flow against a running dev server
// (http://localhost:3000). Exercises: register -> login -> create company ->
// profile -> survey link -> 6 employee submissions -> expense upload -> demo
// scan -> build the audit (inventory, findings, documents) -> recommendation ->
// publish policy + invite + sign (general and personal link) -> quote + mark
// paid -> monitoring run -> alerts -> cross-tenant 404 -> cleanup.
//
// Run: npm run dev (in another shell), then: npm run e2e
process.loadEnvFile(".env.local");

import { randomBytes } from "node:crypto";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const EMAIL = `e2e-${Date.now()}@example.com`;
const PASSWORD = `e2e-${randomBytes(12).toString("hex")}`;

// This script registers accounts and deletes rows directly. Refuse to touch
// anything that is not a local server unless explicitly allowed.
{
  const host = new URL(BASE).hostname;
  if (!["localhost", "127.0.0.1"].includes(host) && process.env.E2E_ALLOW_REMOTE !== "1") {
    console.error(`Refusing to run against ${BASE}. Set E2E_ALLOW_REMOTE=1 if you really mean it.`);
    process.exit(2);
  }
}

const cookies = new Map<string, string>();
const cookieHeader = () => [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
function storeCookies(res: Response) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const pair = c.split(";")[0];
    const i = pair.indexOf("=");
    if (i > 0) cookies.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
async function req(method: string, path: string, opts: { json?: unknown; form?: Record<string, string>; anon?: boolean } = {}): Promise<Response> {
  const headers: Record<string, string> = opts.anon ? {} : { cookie: cookieHeader() };
  let body: string | undefined;
  if (opts.json) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  if (opts.form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opts.form).toString();
  }
  const res = await fetch(BASE + path, { method, headers, body, redirect: "manual" });
  if (!opts.anon) storeCookies(res);
  return res;
}

let passed = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (!cond) throw new Error(`FAILED: ${label}${detail !== undefined ? ` :: ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
  passed++;
  console.log(`  ok  ${label}`);
}
async function json(res: Response): Promise<{ success: boolean; data: any; error?: string }> {
  return res.json();
}

const SIGN_IN = ["A personal account I set up myself", "A mix of personal and company accounts", "A company-provided account", "I do not use AI tools for work"];
const DATA = ["Passwords, logins or security codes", "Customer, client or patient records", "Financial figures, invoices or payment details", "Contracts or legal documents", "Employee or HR information", "Internal emails, notes or documents", "Source code or technical designs", "Only general or public information, or nothing"];

async function main() {
  console.log(`E2E against ${BASE} as ${EMAIL}\n`);

  // 1. Register + login
  let res = await req("POST", "/api/auth/register", { json: { email: EMAIL, name: "E2E Operator", password: PASSWORD, inviteCode: process.env.REGISTRATION_INVITE_CODE } });
  check("register operator -> 201 (first account or invite code)", res.status === 201, await res.text().catch(() => ""));

  const csrf = (await (await req("GET", "/api/auth/csrf")).json()) as { csrfToken: string };
  res = await req("POST", "/api/auth/callback/credentials", { form: { csrfToken: csrf.csrfToken, email: EMAIL, password: PASSWORD, redirect: "false" } });
  check("password login sets a session cookie", [...cookies.keys()].some((k) => k.includes("session-token")));

  // 2. Company (auto-creates the first audit)
  res = await req("POST", "/api/organizations", { json: { name: "E2E Dental Group", industry: "Dental", employeeCount: 24, hasEUexposure: false, contactEmail: "owner@example-client.com", website: "example-client.com" } });
  let body = await json(res);
  check("create company -> 201 with an initial audit", res.status === 201 && body.data.engagements?.length === 1, body);
  const orgId = body.data.id as string;
  const engagementId = body.data.engagements[0].id as string;

  // 3. Profile
  res = await req("PUT", `/api/organizations/${orgId}/profile`, { json: { suite: "google", dataTypes: ["health", "customer_pii"], providedTools: [], hasWrittenPolicy: false, priorities: ["compliance"] } });
  check("save company profile", res.status === 200);

  // 4. Survey link + 6 anonymous submissions with distinct respondent ids
  res = await req("POST", `/api/engagements/${engagementId}/survey-link`, { json: {} });
  body = await json(res);
  check("mint survey link", res.status === 201 && typeof body.data.url === "string");
  const surveyToken = (body.data.url as string).split("/survey/")[1];

  res = await req("GET", `/api/survey?token=${encodeURIComponent(surveyToken)}`, { anon: true });
  body = await json(res);
  const questions: any[] = body.data.domains.flatMap((d: any) => d.questions);
  check("public survey returns only the 13 employee questions", questions.length === 13, questions.length);
  const qid = (text: RegExp) => questions.find((q) => text.test(q.text))?.id as string;
  const Q = { tools: qid(/Which AI tools/), signIn: qid(/how do you usually sign in/), data: qid(/What kinds of information/), guidance: qid(/told you which AI tools/), adopt: qid(/would you use it/), connected: qid(/connected an AI tool/), comment: qid(/want leadership to know/), frequency: qid(/How often/), confident: qid(/confident you have never/) };
  check("found expected question keys", Object.values(Q).every(Boolean), Q);

  const respondents = [
    { tools: ["ChatGPT", "Grammarly"], signIn: SIGN_IN[0], data: [DATA[1]], guidance: "No, nothing has been said", adopt: "Yes", connected: "Yes, to my work email or files", comment: "Please give us an approved tool.", frequency: "Every day", confident: false },
    { tools: ["ChatGPT"], signIn: SIGN_IN[1], data: [DATA[5]], guidance: "No, nothing has been said", adopt: "Yes", connected: "No", frequency: "A few times a week", confident: true },
    { tools: ["ChatGPT", "An AI meeting note-taker (Otter, Fireflies, Fathom, Read.ai, tl;dv)"], signIn: SIGN_IN[0], data: [DATA[2], DATA[5]], guidance: "Only informal advice from a manager or colleague", adopt: "Not sure", connected: "Yes, to my work calendar only", frequency: "Every day", confident: false },
    { tools: ["Claude"], signIn: SIGN_IN[2], data: [DATA[7]], guidance: "No, nothing has been said", adopt: "Yes", connected: "No", frequency: "A few times a month", confident: true },
    { tools: ["None of these"], signIn: SIGN_IN[3], data: [DATA[7]], guidance: "No, nothing has been said", adopt: "Yes", connected: "No", frequency: "Rarely or never", confident: true },
    { tools: ["ChatGPT", "Gemini"], signIn: SIGN_IN[0], data: [DATA[4]], guidance: "No, nothing has been said", adopt: "Yes", connected: "No", comment: "I use it for drafting emails.", frequency: "Every day", confident: false },
  ];
  for (const r of respondents) {
    const answers = [
      { questionId: Q.tools, value: r.tools },
      { questionId: Q.signIn, value: r.signIn },
      { questionId: Q.data, value: r.data },
      { questionId: Q.guidance, value: r.guidance },
      { questionId: Q.adopt, value: r.adopt },
      { questionId: Q.connected, value: r.connected },
      { questionId: Q.frequency, value: r.frequency },
      { questionId: Q.confident, value: r.confident },
      ...(r.comment ? [{ questionId: Q.comment, value: r.comment }] : []),
    ];
    res = await req("POST", "/api/survey", { json: { token: surveyToken, answers }, anon: true });
    if (res.status !== 201) throw new Error(`survey submit failed ${res.status}: ${await res.text()}`);
  }
  check("6 anonymous survey submissions accepted", true);

  res = await req("GET", `/api/engagements/${engagementId}/survey-summary`);
  body = await json(res);
  check("survey summary counts 6 distinct respondents (not collapsed)", body.data.respondentCount === 6, body.data.respondentCount);
  check("survey summary: 5 AI users, ChatGPT reported by 4", body.data.aiUsers === 5 && body.data.toolUsage.chatgpt === 4, body.data.toolUsage);
  check("survey summary: personal-account share 4 of 6", Math.abs(body.data.personalAccountShare - 4 / 6) < 0.01, body.data.personalAccountShare);
  check("comments released at >= 5 respondents", body.data.comments.length === 2 && body.data.commentsWithheld === false, body.data.comments);

  // 5. Expense upload (JSON csv)
  const csv = ["Date,Description,Cardholder,Amount", "2026-07-03,OPENAI *CHATGPT SUBSCR,Ava Example,20.00", "2026-08-03,OPENAI *CHATGPT SUBSCR,Ava Example,20.00", "2026-09-03,OPENAI *CHATGPT SUBSCR,Ava Example,20.00", "2026-08-11,OTTER.AI PRO,Chloe Example,16.99", "2026-08-15,STAPLES 1234,Dan Example,45.10"].join("\n");
  res = await req("POST", `/api/engagements/${engagementId}/expenses`, { json: { csv } });
  body = await json(res);
  check("expense upload finds 2 AI vendor lines, ignores Staples", res.status === 201 && body.data.matches.length === 2 && body.data.rowsScanned === 5, body.data?.matches?.length);

  // 6. Demo workspace scan via the operator route
  res = await req("POST", `/api/organizations/${orgId}/scan`, { json: { demo: true } });
  body = await json(res);
  check("demo scan runs and classifies AI apps", res.status === 200 && body.data.scan && body.data.scan.aiAppCount >= 5, body.data?.scan?.aiAppCount);
  check("scan decrypts user lists for the operator view", Array.isArray(body.data.scan.apps[0].users));

  // 7. Build the audit
  res = await req("POST", `/api/engagements/${engagementId}/pipeline`);
  body = await json(res);
  check("pipeline builds inventory, findings and 4 documents", res.status === 200 && body.data.tools >= 4 && body.data.findings > 0 && body.data.documents === 4, body.data);

  res = await req("GET", `/api/engagements/${engagementId}/tools`);
  body = await json(res);
  const chat = body.data.find((t: any) => t.catalogKey === "chatgpt");
  check("inventory merges survey + scan + expense evidence for ChatGPT", chat && chat.reportedBy === 4 && chat.source === "survey" && chat.monthlySpendCents === 2000 && chat.accessMethod === "personal_account", chat);
  check("inventory marks regulated exposure from survey answers", chat.dataExposureLevel === "regulated", chat.dataExposureLevel);

  // 8. Recommendation
  res = await req("GET", `/api/engagements/${engagementId}/recommendation`);
  body = await json(res);
  check("recommendation ranks plans; Gemini first on Google suite with health data", body.data.primary?.plan.key === "gemini_workspace" && body.data.regulated === true, body.data.primary?.plan.key);

  // 9. Documents content
  const report = await (await req("GET", `/api/engagements/${engagementId}/documents/report/download?format=md`)).text();
  check("report has plain-English short version with survey facts", report.includes("## The short version") && report.includes("5 of 6 surveyed employees"), report.slice(0, 200));
  check("report shows workspace scan evidence", /workspace scan found \d+ AI apps/.test(report));
  check("report shows expense evidence", report.includes("per month on individual AI subscriptions"));
  check("report includes staff comments once threshold met", report.includes("Please give us an approved tool."));
  check("report has no em dashes", !report.includes("\u2014"));
  const plan = await (await req("GET", `/api/engagements/${engagementId}/documents/ai_plan/download?format=md`)).text();
  check("AI plan document generated with dated prices", plan.includes("Recommend Gemini in Google Workspace") && /Checked \d{4}-\d{2}-\d{2}/.test(plan));
  const view = await (await req("GET", `/api/engagements/${engagementId}/documents/aup/download?format=view`)).text();
  check("policy renders as HTML without raw markdown", view.includes("<h2>") && !view.includes("## "));

  // 10. Sign-off: publish, invite, sign via general link and personal link
  res = await req("POST", `/api/engagements/${engagementId}/signoff`);
  body = await json(res);
  check("publish policy", res.status === 200 && body.data.url, body);
  const generalUrl = body.data.url as string;
  const generalToken = generalUrl.split("/sign/")[1];

  res = await req("PUT", `/api/engagements/${engagementId}/signoff`, { json: { emails: ["ava@example-client.com", "ben@example-client.com"], sendEmails: false } });
  body = await json(res);
  check("invite 2 signers with personal links", res.status === 201 && body.data.results.length === 2 && body.data.results[0].url.includes("/sign/"), body.data);
  const personalToken = (body.data.results[1].url as string).split("/sign/")[1];

  res = await req("GET", `/api/sign?token=${encodeURIComponent(generalToken)}`, { anon: true });
  body = await json(res);
  check("public sign page returns escaped policy HTML", res.status === 200 && body.data.html.includes("<h1>") && body.data.pinnedEmail === null);

  res = await req("POST", "/api/sign", { json: { token: generalToken, name: "Ava Example", email: "ava@example-client.com", agree: true }, anon: true });
  check("sign via general link (on roster)", res.status === 201, await res.text().catch(() => ""));
  res = await req("POST", "/api/sign", { json: { token: generalToken, name: "Impostor", email: "ava@example-client.com", agree: true }, anon: true });
  check("re-signing a signed record is rejected (409)", res.status === 409);
  res = await req("POST", "/api/sign", { json: { token: personalToken, name: "Ben Example", email: "someone-else@example.com", agree: true }, anon: true });
  check("personal link pins the invitee's email", res.status === 201);
  res = await req("GET", `/api/engagements/${engagementId}/signoff`);
  body = await json(res);
  const ben = body.data.acknowledgements.find((a: any) => a.email === "ben@example-client.com");
  check("roster shows 2 signed, Ben signed under his own email", body.data.signed === 2 && ben?.status === "signed", body.data.acknowledgements);

  // 11. Quotes + billing
  res = await req("POST", `/api/organizations/${orgId}/quotes`, { json: { kind: "audit" } });
  body = await json(res);
  check("audit quote applies the minimum for 24 staff ($399)", res.status === 201 && body.data.totalCents === 39900, body.data);
  res = await req("POST", `/api/organizations/${orgId}/quotes`, { json: { kind: "monitoring" } });
  body = await json(res);
  const monQuote = body.data.id as string;
  check("monitoring quote created ($49 minimum)", body.data.totalCents === 4900, body.data.totalCents);
  res = await req("PATCH", `/api/quotes/${monQuote}`, { json: { status: "paid" } });
  check("mark monitoring quote paid", res.status === 200);
  res = await req("GET", `/api/organizations/${orgId}/monitoring`);
  body = await json(res);
  check("paid monitoring quote activates monitoring", body.data.monitoringActive === true && body.data.nextResurveyAt, body.data);
  const quoteDoc = await (await req("GET", `/api/quotes/${monQuote}/download?format=view`)).text();
  check("quote document renders", quoteDoc.includes("AI Monitoring (monthly)"));

  // 12. Monitoring cycle (second demo scan surfaces a new app + new user)
  res = await req("POST", `/api/organizations/${orgId}/monitoring`);
  body = await json(res);
  check("monitoring cycle runs a scan", res.status === 200 && body.data.scans === 1, body.data);
  res = await req("GET", `/api/organizations/${orgId}/alerts`);
  body = await json(res);
  const types = body.data.map((a: any) => a.type);
  check("alerts raised for a new AI app and a new user", types.includes("new_ai_app") && types.includes("new_user"), types);
  res = await req("GET", `/api/engagements/${engagementId}/signoff`);
  body = await json(res);
  check("new hire queued for policy sign-off", body.data.acknowledgements.some((a: any) => a.email.startsWith("newhire")), body.data.acknowledgements.map((a: any) => a.email));
  res = await req("PATCH", `/api/organizations/${orgId}/alerts`, { json: { alertId: body.data ? (await json(await req("GET", `/api/organizations/${orgId}/alerts`))).data[0].id : "", resolved: true } });
  check("resolve an alert", res.status === 200);

  // 13. Settings
  res = await req("GET", "/api/settings");
  body = await json(res);
  check("settings load with integration flags", res.status === 200 && typeof body.data.integrations.demoScans === "boolean");

  // 14. Cross-tenant isolation
  const otherEmail = `e2e-other-${Date.now()}@example.com`;
  const saved = new Map(cookies);
  cookies.clear();
  res = await req("POST", "/api/auth/register", { json: { email: otherEmail, name: "Other", password: PASSWORD, inviteCode: process.env.REGISTRATION_INVITE_CODE } });
  if (res.status === 201) {
    const csrf2 = (await (await req("GET", "/api/auth/csrf")).json()) as { csrfToken: string };
    await req("POST", "/api/auth/callback/credentials", { form: { csrfToken: csrf2.csrfToken, email: otherEmail, password: PASSWORD, redirect: "false" } });
    res = await req("GET", `/api/organizations/${orgId}/scan`);
    check("another operator gets 404 for a company they do not own", res.status === 404);
    res = await req("GET", `/api/engagements/${engagementId}/signoff`);
    check("another operator gets 404 for an audit they do not own", res.status === 404);
  } else {
    check("registration closed for a second account without invite code (403)", res.status === 403);
  }
  cookies.clear();
  for (const [k, v] of saved) cookies.set(k, v);

  // 15. Public token misuse
  res = await req("GET", `/api/sign?token=${encodeURIComponent(surveyToken)}`, { anon: true });
  check("a survey token is rejected on the sign endpoint (purpose binding)", res.status === 401);

  if (process.env.E2E_KEEP === "1") {
    console.log(`\nKeeping data. Sign in as ${EMAIL} / ${PASSWORD} and open /app/companies/${orgId}`);
    console.log(`All ${passed} checks passed.`);
    return;
  }

  // Cleanup: delete the company (cascade) and both operators
  res = await req("DELETE", `/api/organizations/${orgId}`);
  check("delete company", res.status === 200);
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  await prisma.consultant.deleteMany({ where: { email: { in: [EMAIL, otherEmail] } } });
  await prisma.$disconnect();
  check("cleanup operators", true);

  console.log(`\nAll ${passed} checks passed.`);
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
