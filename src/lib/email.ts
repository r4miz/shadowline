/**
 * Outbound email via the Resend REST API (no SDK dependency). When
 * RESEND_API_KEY is unset, messages are logged to the server console (without
 * tokens) and reported as not delivered, so dev and demos work without a
 * provider. Callers must treat `delivered: false` as "hand the link over
 * another way".
 */
import { brand } from "@/lib/brand";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface EmailResult {
  delivered: boolean;
  id?: string;
  error?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal branded HTML wrapper. Body text is escaped by callers via `paragraphs`. */
export function simpleHtml(title: string, paragraphs: string[], cta?: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#161A17">${escapeHtml(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:22px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:${brand.accentColor};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(cta.label)}</a></p><p style="font-size:13px;color:#5F6B64">If the button does not work, copy this link: ${escapeHtml(cta.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:${brand.paperColor};font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #DDD6CA;border-radius:12px;padding:28px"><h1 style="margin:0 0 18px;font-size:22px;color:#161A17">${escapeHtml(title)}</h1>${body}${button}</div><p style="font-size:12px;color:#5F6B64;margin:16px 4px">${escapeHtml(brand.name)}</p></div></body></html>`;
}

function redactForLog(text: string): string {
  // Strip anything that looks like a token or long opaque string from logs.
  return text.replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]");
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    } else {
      console.log(`[email:unconfigured] to=${msg.to} subject="${msg.subject}" ${redactForLog(msg.text).slice(0, 120)}`);
    }
    return { delivered: false, error: "email_not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        reply_to: msg.replyTo,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[email] provider error ${res.status}: ${redactForLog(err).slice(0, 200)}`);
      return { delivered: false, error: `provider_${res.status}` };
    }
    const body = (await res.json()) as { id?: string };
    return { delivered: true, id: body.id };
  } catch (error) {
    console.error("[email] send failed:", error instanceof Error ? error.message : "unknown");
    return { delivered: false, error: "send_failed" };
  }
}
