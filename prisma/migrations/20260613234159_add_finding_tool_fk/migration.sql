-- AlterTable
ALTER TABLE "RiskFinding" ADD COLUMN     "aiToolId" TEXT;

-- CreateIndex
CREATE INDEX "RiskFinding_aiToolId_idx" ON "RiskFinding"("aiToolId");

-- AddForeignKey
ALTER TABLE "RiskFinding" ADD CONSTRAINT "RiskFinding_aiToolId_fkey" FOREIGN KEY ("aiToolId") REFERENCES "AITool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
