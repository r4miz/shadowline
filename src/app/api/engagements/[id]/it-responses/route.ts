import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { ownedEngagement } from "@/lib/ownership";
import type { AnswerValue } from "@/lib/scoring";
import { ItResponsesSchema } from "@/lib/validation";

// The optional IT deep-dive: the operator answers the legacy 50 IT questions
// together with the client's IT lead. Stored encrypted like survey answers,
// under a fixed respondent token so they feed the same scoring engine.
const IT_RESPONDENT = "operator-it-deepdive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    const [questions, responses] = await Promise.all([
      prisma.question.findMany({
        where: { audience: "it" },
        orderBy: { sortOrder: "asc" },
        select: { id: true, domain: true, text: true, helpText: true, answerType: true, options: true },
      }),
      prisma.response.findMany({
        where: { engagementId: id, respondentToken: IT_RESPONDENT },
        select: { questionId: true, value: true },
      }),
    ]);
    const answers: Record<string, AnswerValue> = {};
    for (const r of responses) {
      try {
        answers[r.questionId] = decryptJson<AnswerValue>(r.value as string);
      } catch {
        continue;
      }
    }
    return ok({ questions, answers });
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
    const { answers } = ItResponsesSchema.parse(await request.json().catch(() => null));

    const ids = [...new Set(answers.map((a) => a.questionId))];
    const known = await prisma.question.findMany({ where: { id: { in: ids }, audience: "it" }, select: { id: true } });
    if (known.length !== ids.length) {
      return NextResponse.json({ success: false, error: "unknown_question_ids" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.response.deleteMany({ where: { engagementId: id, respondentToken: IT_RESPONDENT } });
      if (answers.length) {
        await tx.response.createMany({
          data: answers.map((a) => ({
            engagementId: id,
            questionId: a.questionId,
            value: encryptJson(a.value),
            respondentToken: IT_RESPONDENT,
          })),
        });
      }
      if (engagement.status === "draft" && answers.length) {
        await tx.engagement.update({ where: { id }, data: { status: "in_progress" } });
      }
    });
    return ok({ saved: answers.length });
  } catch (error) {
    return apiError(error);
  }
}
