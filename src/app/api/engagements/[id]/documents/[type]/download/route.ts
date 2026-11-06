import { requireUser } from "@/lib/api-auth";
import { apiError, notFound } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { DOC_TYPE_LABELS, type GeneratedDocType } from "@/lib/documents/types";
import { documentHtmlFile, documentHtmlView } from "@/lib/documents/html-shell";

const VALID_TYPES: GeneratedDocType[] = ["report", "aup", "exec_readout", "ai_plan"];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Download a generated document as editable Markdown (.md) or styled HTML
// (.html, for Word/Docs import or print-to-PDF). RBAC-scoped.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    const user = await requireUser();
    const { id, type } = await params;
    if (!VALID_TYPES.includes(type as GeneratedDocType)) return notFound();
    const docType = type as GeneratedDocType;

    const format = new URL(request.url).searchParams.get("format") ?? "md";

    const engagement = await prisma.engagement.findFirst({
      where: { id, organization: { consultantId: user.id } },
      select: { id: true, organization: { select: { name: true } } },
    });
    if (!engagement) return notFound();

    const doc = await prisma.policyDocument.findFirst({
      where: { engagementId: id, type: docType },
      orderBy: { version: "desc" },
    });
    if (!doc) return notFound();

    const label = DOC_TYPE_LABELS[docType];
    const base = `${slugify(engagement.organization.name)}-${slugify(label)}`;

    if (format === "view") {
      return new Response(documentHtmlView(label, doc.contentMarkdown), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (format === "html") {
      return new Response(documentHtmlFile(label, doc.contentMarkdown), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.html"`,
        },
      });
    }

    return new Response(doc.contentMarkdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.md"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
