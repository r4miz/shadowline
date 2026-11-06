-- AlterTable
ALTER TABLE "RiskFinding" ADD COLUMN     "questionId" TEXT;

-- CreateIndex
CREATE INDEX "RiskFinding_questionId_idx" ON "RiskFinding"("questionId");

-- AddForeignKey
ALTER TABLE "RiskFinding" ADD CONSTRAINT "RiskFinding_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
