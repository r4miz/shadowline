import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail, simpleHtml } from "@/lib/email";
import { signMagicLinkToken } from "@/lib/tokens";
import { enforceRateLimit } from "@/lib/rate-limit";
import { brand } from "@/lib/brand";

const BodySchema = z.object({ email: z.string().email() });

// Sign-in link by email. The link is single-use, expires in 15 minutes, and is
// never written to logs. If email is not configured, the server cannot deliver
// it; the response says so without revealing whether the account exists.
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "magic-link", 5, 15 * 60 * 1000);
  if (limited) return limited;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Valid email required" }, { status: 400 });
  }

  const { email } = parsed.data;
  const account = await prisma.consultant.findUnique({ where: { email } });

  if (account) {
    const token = await signMagicLinkToken({ email });
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: email,
      subject: `Your ${brand.name} sign-in link`,
      text: `Sign in to ${brand.name}: ${url}\n\nThis link works once and expires in 15 minutes. If you did not request it, ignore this email.`,
      html: simpleHtml("Sign in", ["Use the button below within 15 minutes. The link works once.", "If you did not request this, you can ignore it."], { label: "Sign in", url }),
    });
  }

  return NextResponse.json({
    success: true,
    message: "If that account exists, a sign-in link has been sent.",
  });
}
