import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { generateDocuments } from "@/lib/documents";

// Generate (or regenerate) all three deliverables from current engagement data.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!engagement) return notFound();

    return ok(await generateDocuments(id));
  } catch (error) {
    return apiError(error);
  }
}
