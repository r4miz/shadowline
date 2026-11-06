// Integration smoke for Phase 3: insert fictional encrypted survey responses
// for the Northwind engagement, run regenerateFindings, print the result.
// Fictional data only. Run: node scripts/findings-smoke.ts
process.loadEnvFile(".env.local");

async function main() {
  const { prisma } = await import("../src/lib/db.ts");
  const { encryptJson } = await import("../src/lib/crypto.ts");

  const engagement = await prisma.engagement.findFirst({
    where: { organization: { name: "Northwind Dental Group" } },
    select: { id: true },
  });
  if (!engagement) throw new Error("Seed the vision engagement first (vision-seed.ts).");
  const engagementId = engagement.id;

  // Fresh slate for repeatability.
  await prisma.response.deleteMany({ where: { engagementId } });
  await prisma.riskFinding.deleteMany({ where: { engagementId } });

  const questions = await prisma.question.findMany({
    orderBy: { weight: "desc" },
    take: 12,
  });

  // Build a realistic mix: worst answer for the first 6 (high weight -> red),
  // middle answer for the next 3 (amber), safest for the last 3 (green/skip).
  // Simulate two respondents for one question to exercise worst-case dedupe.
  type Row = { questionId: string; value: unknown };
  const rows: Row[] = [];
  questions.forEach((q, i) => {
    const opts = Array.isArray(q.options) ? (q.options as string[]) : null;
    let value: unknown;
    if (q.answerType === "boolean") {
      value = i < 6 ? false : true;
    } else if (opts && opts.length > 0) {
      if (i < 6) value = opts[0]; // worst
      else if (i < 9) value = opts[Math.floor((opts.length - 1) / 2)]; // middle
      else value = opts[opts.length - 1]; // safest
    } else {
      value = null;
    }
    rows.push({ questionId: q.id, value });
  });
  // Second respondent answers question[6] (a "middle" one) with the worst option
  // to prove worst-case-per-question wins.
  const q6 = questions[6];
  const q6opts = Array.isArray(q6.options) ? (q6.options as string[]) : null;
  if (q6opts) rows.push({ questionId: q6.id, value: q6opts[0] });

  await prisma.response.createMany({
    data: rows.map((r) => ({
      engagementId,
      questionId: r.questionId,
      value: encryptJson(r.value),
      respondentToken: "smoke-respondent",
    })),
  });

  console.log(`Responses inserted: ${rows.length}`);
  console.log(`engagementId=${engagementId}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
