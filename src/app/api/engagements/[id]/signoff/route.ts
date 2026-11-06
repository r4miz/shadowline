import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { ownedEngagement } from "@/lib/ownership";
import { inviteSigners, publishPolicy, publishedPolicy, signoffSummary, signoffUrl } from "@/lib/signoff";
import { SignoffInviteSchema } from "@/lib/validation";

// GET summary, POST publish current AUP version, PUT invite signers.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    const summary = await signoffSummary(id);
    const url = summary.published ? await signoffUrl(id, summary.published.id) : null;
    return ok({ ...summary, url });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    const doc = await publishPolicy(id);
    if (!doc) return NextResponse.json({ success: false, error: "generate_documents_first" }, { status: 400 });
    return ok({ published: { id: doc.id, version: doc.version, publishedAt: doc.publishedAt }, url: await signoffUrl(id, doc.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const engagement = await ownedEngagement(user.id, id);
    if (!engagement) return notFound();
    const body = SignoffInviteSchema.parse(await request.json().catch(() => null));
    if (!(await publishedPolicy(id))) {
      return NextResponse.json({ success: false, error: "publish_first" }, { status: 400 });
    }
    const result = await inviteSigners(id, body.emails, engagement.organization.name, { sendEmails: body.sendEmails });
    return ok(result, 201);
  } catch (error) {
    return apiError(error);
  }
}
