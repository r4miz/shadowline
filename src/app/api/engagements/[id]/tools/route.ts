import { requireUser } from "@/lib/api-auth";
import { apiError, notFound, ok } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { AIToolCreateSchema } from "@/lib/inventory-validation";

// AI tool inventory is scoped through engagement -> organization ownership.

export async function GET(
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

    const tools = await prisma.aITool.findMany({
      where: { engagementId: id },
      orderBy: [{ sanctioned: "asc" }, { name: "asc" }],
    });
    return ok(tools);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = AIToolCreateSchema.parse(
      await request.json().catch(() => null)
    );

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true },
    });
    if (!engagement) return notFound();

    const tool = await prisma.aITool.create({
      data: { ...body, engagementId: id },
    });
    return ok(tool, 201);
  } catch (error) {
    return apiError(error);
  }
}
