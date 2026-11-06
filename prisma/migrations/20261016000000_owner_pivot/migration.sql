-- CreateEnum
CREATE TYPE "EngagementKind" AS ENUM ('initial', 'resurvey');

-- CreateEnum
CREATE TYPE "QuestionAudience" AS ENUM ('employee', 'it');

-- CreateEnum
CREATE TYPE "ToolSource" AS ENUM ('manual', 'survey', 'scan', 'expense');

-- CreateEnum
CREATE TYPE "WorkspaceSuite" AS ENUM ('google', 'microsoft', 'both', 'none', 'unknown');

-- CreateEnum
CREATE TYPE "ConnectorProvider" AS ENUM ('google', 'microsoft', 'demo');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('active', 'revoked', 'error');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('running', 'complete', 'failed');

-- CreateEnum
CREATE TYPE "AiConfidence" AS ENUM ('high', 'medium', 'low', 'none');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('new_ai_app', 'new_user', 'scan_failed', 'resurvey_due', 'signoff_overdue');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "AckStatus" AS ENUM ('pending', 'signed');

-- CreateEnum
CREATE TYPE "QuoteKind" AS ENUM ('audit', 'monitoring');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'paid', 'void');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'ai_plan';

-- AlterTable
ALTER TABLE "AITool" ADD COLUMN     "catalogKey" TEXT,
ADD COLUMN     "monthlySpendCents" INTEGER,
ADD COLUMN     "reportedBy" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "source" "ToolSource" NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "Engagement" ADD COLUMN     "kind" "EngagementKind" NOT NULL DEFAULT 'initial';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "monitoringActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monitoringSince" TIMESTAMP(3),
ADD COLUMN     "nextResurveyAt" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "PolicyDocument" ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "audience" "QuestionAudience" NOT NULL DEFAULT 'it',
ADD COLUMN     "key" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OperatorSettings" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "auditPricePerEmployeeCents" INTEGER NOT NULL DEFAULT 0,
    "auditMinimumCents" INTEGER NOT NULL DEFAULT 0,
    "monitoringPricePerEmployeeCents" INTEGER NOT NULL DEFAULT 0,
    "monitoringMinimumCents" INTEGER NOT NULL DEFAULT 0,
    "businessName" TEXT,
    "replyToEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "suite" "WorkspaceSuite" NOT NULL DEFAULT 'unknown',
    "dataTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providedTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasWrittenPolicy" BOOLEAN,
    "remoteWork" TEXT,
    "priorities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentAiSpendCents" INTEGER,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "ConnectorProvider" NOT NULL,
    "externalTenantId" TEXT,
    "adminEmail" TEXT,
    "encryptedCredentials" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ConnectionStatus" NOT NULL DEFAULT 'active',
    "lastScanAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT,
    "connectionId" TEXT,
    "provider" "ConnectorProvider" NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "userCount" INTEGER,
    "appCount" INTEGER,
    "aiAppCount" INTEGER,
    "error" TEXT,
    "summary" JSONB,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredApp" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "isAi" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" "AiConfidence" NOT NULL DEFAULT 'none',
    "catalogKey" TEXT,
    "category" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "encryptedUsers" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'low',
    "riskNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveredApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseMatch" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "chargeCount" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "monthlyCents" INTEGER NOT NULL,
    "firstChargeAt" TIMESTAMP(3),
    "lastChargeAt" TIMESTAMP(3),
    "cardholder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcknowledgement" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "documentId" TEXT,
    "documentVersion" INTEGER,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "status" "AckStatus" NOT NULL DEFAULT 'pending',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementId" TEXT,
    "kind" "QuoteKind" NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "unitCents" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "minimumCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorSettings_consultantId_key" ON "OperatorSettings"("consultantId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_organizationId_key" ON "CompanyProfile"("organizationId");

-- CreateIndex
CREATE INDEX "ScanConnection_organizationId_idx" ON "ScanConnection"("organizationId");

-- CreateIndex
CREATE INDEX "Scan_organizationId_idx" ON "Scan"("organizationId");

-- CreateIndex
CREATE INDEX "Scan_engagementId_idx" ON "Scan"("engagementId");

-- CreateIndex
CREATE INDEX "DiscoveredApp_scanId_idx" ON "DiscoveredApp"("scanId");

-- CreateIndex
CREATE INDEX "DiscoveredApp_organizationId_externalId_idx" ON "DiscoveredApp"("organizationId", "externalId");

-- CreateIndex
CREATE INDEX "Alert_organizationId_resolvedAt_idx" ON "Alert"("organizationId", "resolvedAt");

-- CreateIndex
CREATE INDEX "ExpenseMatch_engagementId_idx" ON "ExpenseMatch"("engagementId");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgement_engagementId_status_idx" ON "PolicyAcknowledgement"("engagementId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcknowledgement_engagementId_email_key" ON "PolicyAcknowledgement"("engagementId", "email");

-- CreateIndex
CREATE INDEX "Quote_organizationId_idx" ON "Quote"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AITool_engagementId_catalogKey_key" ON "AITool"("engagementId", "catalogKey");

-- CreateIndex
CREATE UNIQUE INDEX "Question_key_key" ON "Question"("key");

-- AddForeignKey
ALTER TABLE "OperatorSettings" ADD CONSTRAINT "OperatorSettings_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanConnection" ADD CONSTRAINT "ScanConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ScanConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredApp" ADD CONSTRAINT "DiscoveredApp_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredApp" ADD CONSTRAINT "DiscoveredApp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseMatch" ADD CONSTRAINT "ExpenseMatch_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgement" ADD CONSTRAINT "PolicyAcknowledgement_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgement" ADD CONSTRAINT "PolicyAcknowledgement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PolicyDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

