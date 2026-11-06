import { NextResponse } from "next/server";
import { apiError, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { markdownToHtml } from "@/lib/documents/markdown";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordSignature } from "@/lib/signoff";
import { verifySignoffToken } from "@/lib/tokens";
import { SignSubmitSchema } from "@/lib/validation";

function invalid() {
  return NextResponse.json({ success: false, error: "invalid_or_expired" }, { status: 401 });
}

// Public, token-gated. GET returns the published policy as safe HTML; POST
// records a signature. Nothing here reveals who else has signed.
export async function GET(request: Request) {
  try {
    const limited = enforceRateLimit(request, "sign-get", 60, 60 * 1000);
    if (limited) return limited;
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return invalid();
    let claims: { engagementId: string; documentId: string; email: string | null };
    try {
      claims = await verifySignoffToken(token);
    } catch {
      return invalid();
    }
    const doc = await prisma.policyDocument.findFirst({
      where: { id: claims.documentId, engagementId: claims.engagementId, type: "aup", publishedAt: { not: null } },
      include: { engagement: { select: { organization: { select: { name: true } } } } },
    });
    if (!doc) return invalid();
    return ok({
      organizationName: doc.engagement.organization.name,
      version: doc.version,
      publishedAt: doc.publishedAt,
      pinnedEmail: claims.email,
      html: markdownToHtml(doc.contentMarkdown),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, "sign-post", 10, 60 * 1000);
    if (limited) return limited;
    const body = SignSubmitSchema.parse(await request.json().catch(() => null));
    let claims: { engagementId: string; documentId: string; email: string | null };
    try {
      claims = await verifySignoffToken(body.token);
    } catch {
      return invalid();
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const result = await recordSignature({
      engagementId: claims.engagementId,
      documentId: claims.documentId,
      pinnedEmail: claims.email,
      name: body.name,
      email: body.email,
      ip,
    });
    if (!result.ok) {
      if (result.reason === "already_signed" || result.reason === "not_on_roster") {
        return NextResponse.json({ success: false, error: result.reason }, { status: 409 });
      }
      return invalid();
    }
    return ok({ signedAt: result.signedAt, version: result.version }, 201);
  } catch (error) {
    return apiError(error);
  }
}
