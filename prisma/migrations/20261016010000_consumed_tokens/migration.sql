-- CreateTable
CREATE TABLE "ConsumedToken" (
    "jti" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumedToken_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "ConsumedToken_expiresAt_idx" ON "ConsumedToken"("expiresAt");

