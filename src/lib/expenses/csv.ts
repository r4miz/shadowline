/**
 * Small RFC 4180 CSV parser. Handles quoted fields, escaped quotes (""),
 * commas and newlines inside quotes, CRLF, and a UTF-8 BOM. Pure, no deps.
 * Enforces row and cell limits so a hostile upload cannot exhaust memory.
 */
export const CSV_MAX_ROWS = 20_000;
export const CSV_MAX_CELL_CHARS = 2_000;
export const CSV_MAX_BYTES = 2 * 1024 * 1024;

export class CsvLimitError extends Error {}

export function parseCsv(input: string, maxRows = CSV_MAX_ROWS): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    if (cell.length > CSV_MAX_CELL_CHARS) {
      throw new CsvLimitError("A cell exceeds the maximum length");
    }
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    // Skip completely blank lines.
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
      if (rows.length > maxRows) {
        throw new CsvLimitError(`More than ${maxRows} rows`);
      }
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushCell();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      // swallow; \n follows in CRLF, or a lone \r is treated as newline
      if (text[i + 1] !== "\n") pushRow();
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) pushRow();
  return rows;
}
