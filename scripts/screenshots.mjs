// Headless Chrome screenshots over the DevTools Protocol (no Playwright needed).
// Emulates real device metrics so mobile widths render at a true 375px ICB.
//
// Usage: node scripts/screenshots.mjs <baseUrl> <outDir> [email] [password] [companyId]
//   baseUrl    e.g. http://localhost:3001 (app) or http://localhost:3100 (landing)
//   email/pw   optional: signs in and captures /app pages
//   companyId  optional: captures each stage of that company's workspace
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , BASE = "http://localhost:3001", OUT = "screenshots", EMAIL, PASSWORD, COMPANY] = process.argv;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, "--headless=new", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-gpu", `--user-data-dir=/tmp/sl-chrome-${Date.now()}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const listeners = new Map();
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      } else if (msg.method && listeners.has(msg.method)) {
        for (const fn of listeners.get(msg.method)) fn(msg.params);
      }
    };
    ws.onopen = () =>
      resolve({
        send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }),
        on: (method, fn) => { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(fn); },
        close: () => ws.close(),
      });
    ws.onerror = reject;
  });
}

async function login() {
  if (!EMAIL || !PASSWORD) return [];
  const jar = new Map();
  const store = (res) => { for (const c of res.headers.getSetCookie?.() ?? []) { const [pair] = c.split(";"); const i = pair.indexOf("="); jar.set(pair.slice(0, i), pair.slice(i + 1)); } };
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`); store(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") }, body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, redirect: "false" }) });
  store(res);
  const url = new URL(BASE);
  return [...jar].map(([name, value]) => ({ name, value, domain: url.hostname, path: "/" }));
}

async function main() {
  const ws = await cdpTarget();
  const cdp = await connect(ws);
  await cdp.send("Page.enable");
  await cdp.send("Network.enable");
  const cookies = await login();
  for (const c of cookies) await cdp.send("Network.setCookie", c);

  const pages = [{ path: "/", name: "home" }];
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const api = async (method, path, body) => (await fetch(BASE + path, { method, headers: { cookie: cookieHeader, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined })).json();
  if (EMAIL) {
    pages.push({ path: "/app", name: "dashboard" }, { path: "/app/settings", name: "settings" }, { path: "/app/companies/new", name: "company-new" });
    if (COMPANY) {
      for (const stage of ["", "profile", "scan", "survey", "expenses", "inventory", "findings", "recommendation", "documents", "signoff", "monitoring", "billing"]) {
        pages.push({ path: `/app/companies/${COMPANY}/${stage}`, name: `company-${stage || "overview"}` });
      }
      // Public pages reached through links the operator mints.
      const org = await api("GET", `/api/organizations/${COMPANY}`);
      const engagementId = org.data?.engagements?.[0]?.id;
      if (engagementId) {
        const survey = await api("POST", `/api/engagements/${engagementId}/survey-link`, {});
        if (survey.data?.url) pages.push({ path: new URL(survey.data.url).pathname, name: "public-survey" });
        const sign = await api("GET", `/api/engagements/${engagementId}/signoff`);
        if (sign.data?.url) pages.push({ path: new URL(sign.data.url).pathname, name: "public-sign" });
      }
      const connect = await api("POST", `/api/organizations/${COMPANY}/connect-link`, {});
      if (connect.data?.url) pages.push({ path: new URL(connect.data.url).pathname, name: "public-connect" });
      pages.push({ path: "/connect/done?provider=google", name: "public-connect-done" });
    }
  } else if (BASE.includes("3001") || BASE.includes("3000")) {
    pages.push({ path: "/login", name: "login" }, { path: "/register", name: "register" });
  }

  const viewports = [
    { name: "desktop", width: 1440, height: 900, mobile: false, scale: 1 },
    { name: "mobile", width: 375, height: 812, mobile: true, scale: 2 },
  ];

  for (const vp of viewports) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.scale, mobile: vp.mobile });
    if (vp.mobile) await cdp.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
    for (const p of pages) {
      const loaded = new Promise((r) => cdp.on("Page.loadEventFired", r));
      await cdp.send("Page.navigate", { url: BASE + p.path });
      await Promise.race([loaded, sleep(15000)]);
      await sleep(1400); // let motion/entrance animations settle
      // Scroll through once so in-view animations trigger, then back to top.
      await cdp.send("Runtime.evaluate", { expression: "new Promise(r=>{document.documentElement.style.scrollBehavior='auto';let y=0;const s=()=>{y+=500;window.scrollTo({top:y,behavior:'instant'});if(y<document.documentElement.scrollHeight){setTimeout(s,160)}else{setTimeout(()=>{window.scrollTo({top:0,behavior:'instant'});setTimeout(r,900)},700)}};s()})", awaitPromise: true });
      const { contentSize } = await cdp.send("Page.getLayoutMetrics");
      const overflow = await cdp.send("Runtime.evaluate", { expression: "document.documentElement.scrollWidth > document.documentElement.clientWidth", returnByValue: true });
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: vp.width, height: Math.min(contentSize.height, 12000), scale: 1 } });
      const file = join(OUT, `${p.name}-${vp.name}.png`);
      writeFileSync(file, Buffer.from(shot.data, "base64"));
      console.log(`${file}  ${vp.width}x${Math.round(contentSize.height)}${overflow.result.value ? "  HORIZONTAL OVERFLOW" : ""}`);
    }
  }
  cdp.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
