-- CreateEnum
CREATE TYPE "FindingOrigin" AS ENUM ('auto', 'manual');

-- AlterTable
ALTER TABLE "RiskFinding" ADD COLUMN     "origin" "FindingOrigin" NOT NULL DEFAULT 'auto';
