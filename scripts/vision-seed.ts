// One-off helper for the Phase 2 §13 vision check: creates a fictional
// consultant + EU-exposed org + engagement, then mints a survey link.
// Fictional data only. Run: node scripts/vision-seed.ts
//
// Env must load BEFORE db.ts is imported (db.ts reads DATABASE_URL at module
// init), so the real imports are dynamic and happen after loadEnvFile.
process.loadEnvFile(".env.local");

const EMAIL = "vision@example.com";
const PASSWORD = "vision-check-pw-123";

async function main() {
  const { hash } = await import("bcryptjs");
  const { prisma } = await import("../src/lib/db.ts");
  const { signRespondentToken } = await import("../src/lib/tokens.ts");

  await prisma.consultant.deleteMany({ where: { email: EMAIL } });
  const consultant = await prisma.consultant.create({
    data: {
      email: EMAIL,
      name: "Vision Consultant",
      hashedPassword: await hash(PASSWORD, 12),
    },
  });
  const org = await prisma.organization.create({
    data: {
      consultantId: consultant.id,
      name: "Northwind Dental Group",
      industry: "Healthcare",
      employeeCount: 45,
      hasEUexposure: true,
    },
  });
  const engagement = await prisma.engagement.create({
    data: { organizationId: org.id, status: "in_progress" },
  });
  const token = await signRespondentToken({ engagementId: engagement.id });

  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        password: PASSWORD,
        orgId: org.id,
        engagementId: engagement.id,
        surveyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/survey/${token}`,
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
