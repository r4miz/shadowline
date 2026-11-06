-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('draft', 'in_progress', 'review', 'complete');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('single', 'multi', 'scale', 'text', 'boolean');

-- CreateEnum
CREATE TYPE "NistFunction" AS ENUM ('GOVERN', 'MAP', 'MEASURE', 'MANAGE');

-- CreateEnum
CREATE TYPE "RagRating" AS ENUM ('red', 'amber', 'green');

-- CreateEnum
CREATE TYPE "Effort" AS ENUM ('low', 'med', 'high');

-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('org_account', 'personal_account', 'browser_ext', 'api', 'mcp_agent');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('aup', 'report', 'exec_readout');

-- CreateTable
CREATE TABLE "Consultant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "hasEUexposure" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "EngagementStatus" NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "helpText" TEXT,
    "answerType" "AnswerType" NOT NULL,
    "options" JSONB,
    "nistFunction" "NistFunction" NOT NULL,
    "owaspRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weight" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "respondentToken" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITool" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "category" TEXT,
    "dataExposureLevel" TEXT,
    "sanctioned" BOOLEAN NOT NULL DEFAULT false,
    "accessMethod" "AccessMethod" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AITool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskFinding" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "ragRating" "RagRating" NOT NULL,
    "owaspRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nistFunction" "NistFunction" NOT NULL,
    "recommendation" TEXT NOT NULL,
    "effort" "Effort" NOT NULL,
    "priorityRank" INTEGER,

    CONSTRAINT "RiskFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_email_key" ON "Consultant"("email");

-- CreateIndex
CREATE INDEX "Organization_consultantId_idx" ON "Organization"("consultantId");

-- CreateIndex
CREATE INDEX "Engagement_organizationId_idx" ON "Engagement"("organizationId");

-- CreateIndex
CREATE INDEX "Response_engagementId_idx" ON "Response"("engagementId");

-- CreateIndex
CREATE INDEX "AITool_engagementId_idx" ON "AITool"("engagementId");

-- CreateIndex
CREATE INDEX "RiskFinding_engagementId_idx" ON "RiskFinding"("engagementId");

-- CreateIndex
CREATE INDEX "PolicyDocument_engagementId_idx" ON "PolicyDocument"("engagementId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITool" ADD CONSTRAINT "AITool_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFinding" ADD CONSTRAINT "RiskFinding_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
