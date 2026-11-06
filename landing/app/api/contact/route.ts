import { NextResponse } from "next/server";
import { z } from "zod";
import { site } from "@/site.config";

// Contact form. Sends one email to CONTACT_TO via Resend when configured.
// Honeypot field + per-IP rate limit. Message content is never logged.

const Body = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  company: z.string().max(200).optional().default(""),
  employees: z.string().max(40).optional().default(""),
  message: z.string().max(4000).optional().default(""),
  website: z.string().max(200).optional().default(""), // honeypot: humans never see it
});

const buckets = new Map<string, { count: number; resetAt: number }>();
function limited(key: string, limit = 5, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(`contact:${ip}`)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please check your name, email and message." }, { status: 400 });
  }
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true }); // bot: pretend success

  const to = process.env.CONTACT_TO;
  const from = process.env.EMAIL_FROM;
  const key = process.env.RESEND_API_KEY;
  if (!to || !from || !key) {
    console.log("[contact] inquiry received but email delivery is not configured");
    return NextResponse.json({ ok: true, delivered: false });
  }

  const text = [`Name: ${d.name}`, `Email: ${d.email}`, d.company && `Company: ${d.company}`, d.employees && `Employees: ${d.employees}`, "", d.message].filter(Boolean).join("\n");
  const html = `<p><strong>Name:</strong> ${escapeHtml(d.name)}<br><strong>Email:</strong> ${escapeHtml(d.email)}${d.company ? `<br><strong>Company:</strong> ${escapeHtml(d.company)}` : ""}${d.employees ? `<br><strong>Employees:</strong> ${escapeHtml(d.employees)}` : ""}</p><p>${escapeHtml(d.message).replace(/\n/g, "<br>")}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: d.email, subject: `${site.name} inquiry from ${d.name}${d.company ? ` (${d.company})` : ""}`.replace(/[\r\n]+/g, " ").slice(0, 200), text, html }),
  });
  if (!res.ok) {
    console.error(`[contact] provider error ${res.status}`);
    return NextResponse.json({ ok: false, error: "We could not send your message right now. Please email us directly." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, delivered: true });
}
