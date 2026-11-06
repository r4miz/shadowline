import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runMonitoringCycle } from "@/lib/monitoring";

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Daily monitoring cycle. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const reports = await runMonitoringCycle();
  return NextResponse.json({ success: true, data: { companies: reports.length, reports } });
}

export const GET = handle;
export const POST = handle;
