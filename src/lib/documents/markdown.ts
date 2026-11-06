/**
 * Minimal, safe Markdown to HTML renderer for the document views. It handles
 * only the subset our own generators emit (headings, paragraphs, line breaks,
 * blockquotes, bullet and numbered lists, pipe tables, bold, italic,
 * horizontal rules) and ESCAPES all text first, so operator-entered finding
 * text or a survey comment can never inject markup. This is deliberately not
 * a general-purpose parser: no links, no raw HTML, no images.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  // Escape first, then re-introduce the only inline markup we support.
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(>])_([^_\n]+?)_(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>");
}

function isTableSep(line: string): boolean {
  return /^\|(\s*:?-+:?\s*\|)+\s*$/.test(line.trim());
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isBlockStart(t: string): boolean {
  return (
    /^(#{1,6})\s+/.test(t) ||
    t === "---" ||
    t === "***" ||
    /^[-*]\s+/.test(t) ||
    /^\d+\.\s+/.test(t) ||
    t.startsWith("|") ||
    t.startsWith(">")
  );
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      out.push("<hr>");
      i++;
      continue;
    }

    // Headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote: consecutive "> " lines form one quote
    if (trimmed.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${quoted.map(inline).join("<br>")}</p></blockquote>`);
      continue;
    }

    // Table: a pipe row immediately followed by a separator row
    if (trimmed.startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = cells(line);
      i += 2; // skip header + separator
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        bodyRows.push(cells(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Paragraph: gather until a blank line or a block starter. Single line
    // breaks are kept (the generators use them for label lines).
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      const t = lines[i].trim();
      if (isBlockStart(t)) break;
      para.push(t);
      i++;
    }
    out.push(`<p>${para.map(inline).join("<br>")}</p>`);
  }

  return out.join("\n");
}
