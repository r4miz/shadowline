import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { QUESTION_BANK } from "../src/lib/question-bank.ts";
import { EMPLOYEE_SURVEY } from "../src/lib/employee-survey.ts";

process.loadEnvFile(".env.local");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Idempotent. Employee questions are upserted by stable key. Legacy IT
// questions are matched by text (they predate keys) and tagged in place.
async function main() {
  let inserted = 0;
  let updated = 0;

  for (const [i, q] of EMPLOYEE_SURVEY.entries()) {
    const data = {
      domain: q.domain,
      text: q.text,
      helpText: q.helpText ?? null,
      answerType: q.answerType,
      options: q.options ?? undefined,
      nistFunction: q.nistFunction,
      owaspRefs: q.owaspRefs,
      weight: q.weight,
      audience: "employee" as const,
      sortOrder: i + 1,
    };
    const existing = await prisma.question.findUnique({ where: { key: q.key } });
    if (existing) {
      await prisma.question.update({ where: { key: q.key }, data });
      updated++;
    } else {
      await prisma.question.create({ data: { ...data, key: q.key } });
      inserted++;
    }
  }

  for (const [i, q] of QUESTION_BANK.entries()) {
    const key = `it_${String(i + 1).padStart(2, "0")}`;
    const data = {
      domain: q.domain,
      text: q.text,
      helpText: q.helpText ?? null,
      answerType: q.answerType,
      options: q.options ?? undefined,
      nistFunction: q.nistFunction,
      owaspRefs: q.owaspRefs,
      weight: q.weight,
      audience: "it" as const,
      sortOrder: 100 + i,
    };
    const byKey = await prisma.question.findUnique({ where: { key } });
    if (byKey) {
      await prisma.question.update({ where: { key }, data });
      updated++;
      continue;
    }
    const byText = await prisma.question.findFirst({
      where: { text: q.text, key: null },
      select: { id: true },
    });
    if (byText) {
      await prisma.question.update({ where: { id: byText.id }, data: { ...data, key } });
      updated++;
    } else {
      await prisma.question.create({ data: { ...data, key } });
      inserted++;
    }
  }

  console.log(`Seed complete: ${inserted} inserted, ${updated} updated.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
