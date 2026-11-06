import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { CSV_MAX_BYTES, CsvLimitError } from "@/lib/expenses/csv";
import { matchExpenses, summarizeExpenses } from "@/lib/expenses/match";
import { ownedEngagement } from "@/lib/ownership";
import { enforceRateLimit } from "@/lib/rate-limit";

// Expense scan. The uploaded statement is parsed in memory and discarded; only
// aggregated AI vendor matches are stored. Raw rows are never logged.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    const matches = await prisma.expenseMatch.findMany({ where: { engagementId: id }, orderBy: { totalCents: "desc" } });
    return ok({ matches, summary: summarizeExpenses(matches.map((m) => ({ ...m, caution: undefined }))) });
  } catch (error) {
    return apiError(error);
  }
}

async function readCsv(request: Request): Promise<string | null> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return null;
    if (file.size > CSV_MAX_BYTES) throw new CsvLimitError("File is larger than 2 MB");
    return await file.text();
  }
  const body = (await request.json().catch(() => null)) as { csv?: unknown } | null;
  if (!body || typeof body.csv !== "string") return null;
  if (body.csv.length > CSV_MAX_BYTES) throw new CsvLimitError("Pasted text is larger than 2 MB");
  return body.csv;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = enforceRateLimit(request, "expenses-upload", 20, 10 * 60 * 1000);
    if (limited) return limited;
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > CSV_MAX_BYTES + 64 * 1024) {
      return NextResponse.json({ success: false, error: "File is larger than 2 MB" }, { status: 413 });
    }
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();

    let csv: string | null;
    try {
      csv = await readCsv(request);
    } catch (error) {
      if (error instanceof CsvLimitError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 413 });
      }
      throw error;
    }
    if (!csv) return NextResponse.json({ success: false, error: "Provide a CSV file or pasted CSV text" }, { status: 400 });

    let result;
    try {
      result = matchExpenses(csv);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not parse the file";
      return NextResponse.json({ success: false, error: message }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.expenseMatch.deleteMany({ where: { engagementId: id } });
      if (result.matches.length) {
        await tx.expenseMatch.createMany({
          data: result.matches.map((m) => ({
            engagementId: id,
            vendorKey: m.vendorKey,
            vendorName: m.vendorName,
            toolName: m.toolName,
            chargeCount: m.chargeCount,
            totalCents: m.totalCents,
            monthlyCents: m.monthlyCents,
            firstChargeAt: m.firstChargeAt,
            lastChargeAt: m.lastChargeAt,
            cardholder: m.cardholder,
          })),
        });
      }
    });

    const matches = await prisma.expenseMatch.findMany({ where: { engagementId: id }, orderBy: { totalCents: "desc" } });
    return ok(
      { rowsScanned: result.rowsScanned, matches, summary: summarizeExpenses(result.matches), columns: result.columns },
      201
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!(await ownedEngagement(user.id, id))) return notFound();
    await prisma.expenseMatch.deleteMany({ where: { engagementId: id } });
    return ok({ cleared: true });
  } catch (error) {
    return apiError(error);
  }
}
