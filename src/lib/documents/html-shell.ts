import { brand } from "@/lib/brand";
import { markdownToHtml } from "@/lib/documents/markdown";

// Print-optimized, dependency-free styling shared by the .html export and the
// in-app print view. Tuned for "Save as PDF" from the browser. Colours come
// from brand.ts so a rebrand is a single-file change (spec section 11).
export const DOC_PRINT_CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    color: ${brand.primaryColor}; line-height: 1.55; max-width: 820px; margin: 0 auto;
    padding: 48px 32px; background: #fff;
  }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 20px; margin: 32px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
  h3 { font-size: 16px; margin: 20px 0 6px; }
  p { margin: 8px 0; }
  ul, ol { margin: 8px 0; padding-left: 24px; }
  li { margin: 3px 0; }
  hr { border: none; border-top: 2px solid ${brand.primaryColor}; margin: 20px 0; }
  blockquote {
    margin: 16px 0; padding: 10px 14px; background: #f8fafc;
    border-left: 4px solid ${brand.accentColor}; color: #475569; font-size: 13px;
  }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; }
  strong { font-weight: 600; }
  .doc-toolbar {
    position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 8px;
    padding: 8px 0 16px; background: #fff;
  }
  .doc-toolbar button, .doc-toolbar a {
    font: inherit; font-size: 13px; padding: 6px 12px; border: 1px solid #cbd5e1;
    border-radius: 6px; background: #fff; color: #1a1a2e; cursor: pointer; text-decoration: none;
  }
  @media print { .doc-toolbar { display: none; } body { padding: 0; } }
`;

// A self-contained HTML file for the .html export (no toolbar).
export function documentHtmlFile(titleLabel: string, markdown: string): string {
  return shell(titleLabel, "", markdown);
}

// The in-app print/view page: same styling plus a (print-hidden) toolbar with
// Print and download actions. Rendered inline in a browser tab.
export function documentHtmlView(
  titleLabel: string,
  markdown: string
): string {
  const toolbar = `<div class="doc-toolbar">
  <a href="?format=md">Download .md</a>
  <a href="?format=html">Download .html</a>
  <button type="button" onclick="window.print()">Print / Save as PDF</button>
</div>`;
  return shell(titleLabel, toolbar, markdown);
}

function shell(titleLabel: string, toolbar: string, markdown: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeAttr(titleLabel)}</title>
<style>${DOC_PRINT_CSS}</style>
</head>
<body>
${toolbar}
${markdownToHtml(markdown)}
</body>
</html>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
