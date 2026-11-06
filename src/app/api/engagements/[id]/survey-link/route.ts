import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { hashAccessCode, signRespondentToken } from "@/lib/tokens";

const SurveyLinkSchema = z.object({
  accessCode: z.string().min(4).max(64).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { accessCode } = SurveyLinkSchema.parse(
      await request.json().catch(() => ({}))
    );

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!engagement) return notFound();

    const token = await signRespondentToken({
      engagementId: id,
      accessCodeHash: accessCode ? hashAccessCode(accessCode) : undefined,
    });

    return ok(
      { url: `${process.env.NEXT_PUBLIC_APP_URL}/survey/${token}` },
      201
    );
  } catch (error) {
    return apiError(error);
  }
}
