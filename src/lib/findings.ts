/**
 * Server-side orchestration for risk findings: load survey responses, decrypt
 * them, run the deterministic scoring engine, and persist draft RiskFinding
 * rows. RBAC (engagement ownership) is enforced by the calling route BEFORE
 * these run, nothing here re-checks the consultant.
 *
 * NEVER log decrypted answer values here (spec guardrail).
 */
import type { Prisma } from "@prisma/client";

import { decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import {
  generateFindingDrafts,
  worstResponsePerQuestion,
  type AnswerValue,
  type IdentifiedResponse,
  type NistFunction,
  type ScorableQuestion,
} from "@/lib/scoring";

type QuestionRow = {
  id: string;
  text: string;
  domain: string;
  answerType: string;
  options: Prisma.JsonValue;
  nistFunction: NistFunction;
  owaspRefs: string[];
  weight: number;
};

function toScorableQuestion(q: QuestionRow): ScorableQuestion {
  const options = Array.isArray(q.options)
    ? q.options.filter((o): o is string => typeof o === "string")
    : null;
  // The scoring engine only understands single/multi/boolean; anything else
  // (scale/text) is left as-is and simply scores as unscoreable.
  return {
    text: q.text,
    domain: q.domain,
    answerType: q.answerType as ScorableQuestion["answerType"],
    options,
    nistFunction: q.nistFunction,
    owaspRefs: q.owaspRefs,
    weight: q.weight,
  };
}

/** Load + decrypt every response for an engagement as scoreable inputs. */
export async function loadIdentifiedResponses(
  engagementId: string
): Promise<IdentifiedResponse[]> {
  const responses = await prisma.response.findMany({
    where: { engagementId },
    select: { questionId: true, value: true, question: true },
  });

  const out: IdentifiedResponse[] = [];
  for (const r of responses) {
    let value: AnswerValue;
    try {
      value = decryptJson<AnswerValue>(r.value as string);
    } catch {
      // A response we can't decrypt is skipped rather than failing the run.
      continue;
    }
    out.push({
      questionId: r.questionId,
      question: toScorableQuestion(r.question as QuestionRow),
      value,
    });
  }
  return out;
}

/**
 * Recompute auto findings for an engagement: worst-case answer per question →
 * draft findings → persist. Replaces existing `auto` findings only; manual /
 * consultant-edited findings (origin = manual) are preserved. Returns the full
 * finding set ordered by priorityRank.
 */
export async function regenerateFindings(engagementId: string) {
  const [responses, tools] = await Promise.all([
    loadIdentifiedResponses(engagementId),
    prisma.aITool.findMany({
      where: { engagementId },
      select: {
        id: true,
        name: true,
        vendor: true,
        dataExposureLevel: true,
        sanctioned: true,
        accessMethod: true,
      },
    }),
  ]);
  // Findings come from BOTH the survey responses and the AI tool inventory
  // (spec §4, the inventory is the heart of a shadow-AI audit).
  const drafts = generateFindingDrafts(worstResponsePerQuestion(responses), tools);

  await prisma.$transaction(async (tx) => {
    // Sources the consultant has already adopted (an auto finding they edited
    // became `manual`, keeping its questionId / aiToolId). Don't regenerate an
    // auto finding for these, that would duplicate the consultant's edited one.
    const manual = await tx.riskFinding.findMany({
      where: { engagementId, origin: "manual" },
      select: { questionId: true, aiToolId: true },
    });
    const claimedQuestions = new Set(
      manual.map((f) => f.questionId).filter((id): id is string => id !== null)
    );
    const claimedTools = new Set(
      manual.map((f) => f.aiToolId).filter((id): id is string => id !== null)
    );

    await tx.riskFinding.deleteMany({
      where: { engagementId, origin: "auto" },
    });

    const fresh = drafts.filter(
      (d) =>
        (!d.questionId || !claimedQuestions.has(d.questionId)) &&
        (!d.aiToolId || !claimedTools.has(d.aiToolId))
    );
    if (fresh.length > 0) {
      await tx.riskFinding.createMany({
        data: fresh.map((d) => ({
          engagementId,
          title: d.title,
          description: d.description,
          likelihood: d.likelihood,
          impact: d.impact,
          ragRating: d.ragRating,
          owaspRefs: d.owaspRefs,
          nistFunction: d.nistFunction,
          recommendation: d.recommendation,
          effort: d.effort,
          priorityRank: d.priorityRank,
          questionId: d.questionId,
          aiToolId: d.aiToolId,
          origin: "auto" as const,
        })),
      });
    }
  });

  return listFindings(engagementId);
}

/** All findings for an engagement, ordered for the roadmap (rank, then rag). */
export function listFindings(engagementId: string) {
  return prisma.riskFinding.findMany({
    where: { engagementId },
    orderBy: [{ priorityRank: "asc" }, { impact: "desc" }],
  });
}
