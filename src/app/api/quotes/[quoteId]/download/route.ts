import { requireUser } from "@/lib/api-auth";
import { apiError, notFound } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { documentHtmlFile, documentHtmlView } from "@/lib/documents/html-shell";
import { quoteMarkdown, settingsFor } from "@/lib/quotes";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const user = await requireUser();
    const { quoteId } = await params;
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, organization: { consultantId: user.id } },
      include: { organization: { select: { name: true } } },
    });
    if (!quote) return notFound();
    const settings = await settingsFor(user.id);
    const md = quoteMarkdown(quote, quote.organization.name, settings.businessName);
    const label = `Quote (${quote.kind})`;
    const format = new URL(request.url).searchParams.get("format") ?? "view";
    const base = `${slugify(quote.organization.name)}-quote-${quote.kind}`;
    if (format === "html") {
      return new Response(documentHtmlFile(label, md), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.html"` },
      });
    }
    if (format === "md") {
      return new Response(md, {
        headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.md"` },
      });
    }
    return new Response(documentHtmlView(label, md), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    return apiError(error);
  }
}
