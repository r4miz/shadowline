import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/api-auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: error.flatten() },
      { status: 400 }
    );
  }
  // Log shape, not payload: Prisma/fetch errors can embed request data.
  const e = error as { name?: string; message?: string; code?: string } | null;
  console.error("Unexpected API error:", { name: e?.name, message: e?.message, code: e?.code });
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  );
}

export function notFound() {
  return NextResponse.json(
    { success: false, error: "Not found" },
    { status: 404 }
  );
}
