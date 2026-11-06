import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const GET = handlers.GET;

// Password sign-in attempts are throttled per IP here and per account inside
// the Credentials provider (src/lib/auth.ts).
export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.endsWith("/callback/credentials")) {
    const limited = enforceRateLimit(request, "login", 10, 15 * 60 * 1000);
    if (limited) return limited;
  }
  return handlers.POST(request);
}
