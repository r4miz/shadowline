/**
 * Policy sign-off: publish an AUP version, mint sign links, record signatures.
 * The employee-facing route is token-gated; the operator routes are RBAC-scoped
 * by the caller before these run.
 */
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { brand } from "@/lib/brand";
import { sendEmail, simpleHtml } from "@/lib/email";
import { signSignoffToken } from "@/lib/tokens";

export async function publishPolicy(engagementId: string) {
  const doc = await prisma.policyDocument.findFirst({
    where: { engagementId, type: "aup" },
    orderBy: { version: "desc" },
  });
  if (!doc) return null;
  return prisma.policyDocument.update({ where: { id: doc.id }, data: { publishedAt: new Date() } });
}

export async function publishedPolicy(engagementId: string) {
  return prisma.policyDocument.findFirst({
    where: { engagementId, type: "aup", publishedAt: { not: null } },
    orderBy: { version: "desc" },
  });
}

export async function signoffUrl(engagementId: string, documentId: string, email?: string): Promise<string> {
  const token = await signSignoffToken({ engagementId, documentId, email });
  return `${process.env.NEXT_PUBLIC_APP_URL}/sign/${token}`;
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip + (process.env.TOKEN_SECRET ?? ""), "utf8").digest("hex").slice(0, 32);
}

/** Add employees to the roster (pending) and optionally email them the link. */
export async function inviteSigners(
  engagementId: string,
  emails: string[],
  companyName: string,
  options: { sendEmails: boolean }
) {
  const doc = await publishedPolicy(engagementId);
  if (!doc) throw new Error("Publish the policy before inviting signers");
  const url = await signoffUrl(engagementId, doc.id);
  const results: Array<{ email: string; delivered: boolean; url: string }> = [];
  for (const raw of emails.slice(0, 500)) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    await prisma.policyAcknowledgement.upsert({
      where: { engagementId_email: { engagementId, email } },
      update: { invitedAt: new Date() },
      create: { engagementId, documentId: doc.id, documentVersion: doc.version, email },
    });
    // Each invitee gets a personal link that pins their email server-side.
    const personalUrl = await signoffUrl(engagementId, doc.id, email);
    let delivered = false;
    if (options.sendEmails) {
      const r = await sendEmail({
        to: email,
        subject: `${companyName}: please read and sign the AI Acceptable Use Policy`,
        text: `${companyName} has adopted an AI Acceptable Use Policy. Please read it and confirm you have done so: ${personalUrl}`,
        html: simpleHtml(
          "Please read and sign the AI policy",
          [`${companyName} has adopted an AI Acceptable Use Policy that explains which AI tools are approved and what information may be used with them.`, "Reading and confirming takes about five minutes."],
          { label: "Read and sign", url: personalUrl }
        ),
      });
      delivered = r.delivered;
    }
    results.push({ email, delivered, url: personalUrl });
  }
  return { url, results };
}

export type SignatureResult =
  | { ok: true; signedAt: Date; version: number | null }
  | { ok: false; reason: "invalid" | "already_signed" | "not_on_roster" };

/**
 * Record a signature. A personal link pins the email and may create the row.
 * A general link only completes a PENDING roster row for the email given, so
 * it can neither pad the roster nor overwrite a colleague's signature.
 */
export async function recordSignature(input: {
  engagementId: string;
  documentId: string;
  pinnedEmail: string | null;
  name: string;
  email: string;
  ip: string | null;
}): Promise<SignatureResult> {
  const doc = await prisma.policyDocument.findFirst({
    where: { id: input.documentId, engagementId: input.engagementId, publishedAt: { not: null } },
    select: { id: true, version: true },
  });
  if (!doc) return { ok: false, reason: "invalid" };
  const email = (input.pinnedEmail ?? input.email).trim().toLowerCase();
  const name = input.name.trim();
  const now = new Date();

  const existing = await prisma.policyAcknowledgement.findUnique({
    where: { engagementId_email: { engagementId: input.engagementId, email } },
    select: { id: true, status: true, documentVersion: true },
  });
  if (existing?.status === "signed" && existing.documentVersion === doc.version) {
    return { ok: false, reason: "already_signed" };
  }
  if (!input.pinnedEmail && !existing) {
    return { ok: false, reason: "not_on_roster" };
  }
  const data = { name, status: "signed" as const, signedAt: now, ipHash: hashIp(input.ip), documentId: doc.id, documentVersion: doc.version };
  if (existing) {
    await prisma.policyAcknowledgement.update({ where: { id: existing.id }, data });
  } else {
    await prisma.policyAcknowledgement.create({ data: { engagementId: input.engagementId, email, ...data } });
  }
  return { ok: true, signedAt: now, version: doc.version };
}

export async function signoffSummary(engagementId: string) {
  const [doc, acks] = await Promise.all([
    publishedPolicy(engagementId),
    prisma.policyAcknowledgement.findMany({ where: { engagementId }, orderBy: [{ status: "asc" }, { invitedAt: "asc" }] }),
  ]);
  const signed = acks.filter((a) => a.status === "signed").length;
  const overdueCutoff = new Date();
  overdueCutoff.setUTCDate(overdueCutoff.getUTCDate() - 14);
  const overdue = acks.filter((a) => a.status === "pending" && a.invitedAt < overdueCutoff).length;
  return {
    published: doc ? { id: doc.id, version: doc.version, publishedAt: doc.publishedAt } : null,
    total: acks.length,
    signed,
    pending: acks.length - signed,
    overdue,
    acknowledgements: acks.map((a) => ({ id: a.id, name: a.name, email: a.email, status: a.status, invitedAt: a.invitedAt, signedAt: a.signedAt, documentVersion: a.documentVersion })),
    brandName: brand.name,
  };
}
