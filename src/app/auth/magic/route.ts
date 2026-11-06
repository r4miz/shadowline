import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing-token", request.url)
    );
  }

  try {
    await signIn("magic-token", { token, redirect: false });
    return NextResponse.redirect(new URL("/app", request.url));
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=invalid-or-expired", request.url)
    );
  }
}
