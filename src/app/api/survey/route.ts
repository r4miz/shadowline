import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, ok } from "@/lib/api-response";
import { encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { enforceRateLimit, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  hashAccessCode,
  verifyRespondentToken,
} from "@/lib/tokens";

// Anonymous respondent survey API. No authentication: access is gated purely by
// the signed bearer token (and an optional access code whose hash is carried in
// the token). NEVER log answer values here, spec guardrail.

function invalidOrExpired() {
  return NextResponse.json(
    { success: false, error: "invalid_or_expired" },
    { status: 401 }
  );
}

function accessCodeRequired() {
  return NextResponse.json(
    { success: false, error: "access_code_required" },
    { status: 401 }
  );
}

function sha256hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Verify the bearer token and (when present) the access code.
 * Returns the engagementId on success, or a NextResponse to short-circuit.
 */
async function authorize(
  rawToken: string | null | undefined,
  code: string | null | undefined
): Promise<{ engagementId: string } | NextResponse> {
  if (!rawToken) return invalidOrExpired();

  let payload: { engagementId: string; accessCodeHash?: string };
  try {
    payload = await verifyRespondentToken(rawToken);
  } catch {
    return invalidOrExpired();
  }

  if (payload.accessCodeHash) {
    if (!code || hashAccessCode(code) !== payload.accessCodeHash) {
      return accessCodeRequired();
    }
  }

  return { engagementId: payload.engagementId };
}

export async function GET(request: Request) {
  try {
    const limited = enforceRateLimit(request, "survey-get", 60, 60 * 1000);
    if (limited) return limited;

    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const code = url.searchParams.get("code");

    const auth = await authorize(token, code);
    if (auth instanceof NextResponse) return auth;

    const engagement = await prisma.engagement.findUnique({
      where: { id: auth.engagementId },
      select: {
        status: true,
        organization: { select: { name: true } },
      },
    });
    if (!engagement || engagement.status === "complete") {
      return invalidOrExpired();
    }

    const questions = await prisma.question.findMany({
      where: { audience: "employee" },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        domain: true,
        text: true,
        helpText: true,
        answerType: true,
        options: true,
      },
    });

    // Group by domain, preserving insertion order of first appearance.
    const domainOrder: string[] = [];
    const byDomain = new Map<
      string,
      Array<{
        id: string;
        text: string;
        helpText: string | null;
        answerType: string;
        options: unknown;
      }>
    >();
    for (const q of questions) {
      if (!byDomain.has(q.domain)) {
        byDomain.set(q.domain, []);
        domainOrder.push(q.domain);
      }
      byDomain.get(q.domain)!.push({
        id: q.id,
        text: q.text,
        helpText: q.helpText,
        answerType: q.answerType,
        options: q.options,
      });
    }

    const domains = domainOrder.map((domain) => ({
      domain,
      questions: byDomain.get(domain)!,
    }));

    return ok({
      organizationName: engagement.organization.name,
      domains,
    });
  } catch (error) {
    return apiError(error);
  }
}

const SubmitSchema = z.object({
  token: z.string().min(1),
  code: z.string().optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: z.union([
          z.string().max(4000),
          z.array(z.string().max(500)).max(50),
          z.boolean(),
        ]),
      })
    )
    .min(1)
    .max(200),
});

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, "survey-post", 60, 60 * 1000);
    if (limited) return limited;

    const body = SubmitSchema.parse(await request.json().catch(() => null));

    const auth = await authorize(body.token, body.code);
    if (auth instanceof NextResponse) return auth;

    // The whole company shares one link, so also throttle per link and cap
    // total submissions relative to headcount to blunt flooding.
    const perToken = rateLimit(`survey-post-token:${sha256hex(body.token).slice(0, 16)}`, 300, 60 * 60 * 1000);
    if (!perToken.ok) return tooManyRequests(perToken.retryAfter);

    const engagement = await prisma.engagement.findUnique({
      where: { id: auth.engagementId },
      select: { id: true, status: true, organization: { select: { employeeCount: true } } },
    });
    if (!engagement || engagement.status === "complete") {
      return invalidOrExpired();
    }
    const submissions = await prisma.response.groupBy({
      by: ["respondentToken"],
      where: { engagementId: engagement.id, question: { audience: "employee" } },
    });
    if (submissions.length >= Math.max(50, engagement.organization.employeeCount * 3)) {
      return invalidOrExpired();
    }

    // Validate every submitted questionId exists.
    const questionIds = [...new Set(body.answers.map((a) => a.questionId))];
    const known = await prisma.question.findMany({
      where: { id: { in: questionIds }, audience: "employee" },
      select: { id: true },
    });
    const knownIds = new Set(known.map((q) => q.id));
    const unknown = questionIds.filter((id) => !knownIds.has(id));
    if (unknown.length > 0) {
      return NextResponse.json(
        { success: false, error: "unknown_question_ids" },
        { status: 400 }
      );
    }

    // One opaque id per submission groups a respondent's answers together.
    // It is random, never derived from the shared link, and never identifies
    // the person.
    const respondentToken = randomUUID();

    await prisma.response.createMany({
      data: body.answers.map((answer) => ({
        engagementId: auth.engagementId,
        questionId: answer.questionId,
        value: encryptJson(answer.value),
        respondentToken,
      })),
    });

    if (engagement.status === "draft") {
      await prisma.engagement.update({
        where: { id: auth.engagementId },
        data: { status: "in_progress" },
      });
    }

    return ok({ submitted: body.answers.length }, 201);
  } catch (error) {
    return apiError(error);
  }
}
