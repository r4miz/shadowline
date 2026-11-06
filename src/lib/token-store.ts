/**
 * Single-use enforcement for tokens that carry a `jti`. The first caller to
 * record a jti wins; a concurrent or later presentation of the same token is
 * rejected because the primary key already exists.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function consumeOnce(jti: string, purpose: string, expiresAt: Date): Promise<boolean> {
  try {
    await prisma.consumedToken.create({ data: { jti, purpose, expiresAt } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

/** Housekeeping: drop rows whose token has expired anyway. Safe to call any time. */
export async function pruneConsumedTokens(now = new Date()) {
  return prisma.consumedToken.deleteMany({ where: { expiresAt: { lt: now } } });
}
