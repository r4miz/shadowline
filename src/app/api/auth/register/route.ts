import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

const BodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(10).max(200),
  inviteCode: z.string().max(200).optional(),
});

class RegistrationClosed extends Error {}

// Single-operator product: the first account registers freely; afterwards
// registration needs REGISTRATION_INVITE_CODE. Compared in constant time.
function inviteAccepted(code: string | undefined): boolean {
  const expected = process.env.REGISTRATION_INVITE_CODE;
  if (!expected || !code) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "register", 5, 15 * 60 * 1000);
  if (limited) return limited;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { email, name, password, inviteCode } = parsed.data;
  const hashedPassword = await hash(password, 12);

  try {
    const account = await prisma.$transaction(
      async (tx) => {
        const accounts = await tx.consultant.count();
        if (accounts > 0 && !inviteAccepted(inviteCode)) throw new RegistrationClosed();
        return tx.consultant.create({
          data: { email, name, hashedPassword },
          select: { id: true, email: true, name: true },
        });
      },
      { isolationLevel: "Serializable" }
    );
    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationClosed) {
      return NextResponse.json(
        { success: false, error: "Registration is closed. Ask the account owner for an invite code." },
        { status: 403 }
      );
    }
    // Duplicate email or a serialization retry: same generic answer either way.
    return NextResponse.json(
      { success: false, error: "Could not create the account. If you already have one, sign in instead." },
      { status: 409 }
    );
  }
}
