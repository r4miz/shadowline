/**
 * Expense matching: find AI vendor charges in a card/expense export and
 * aggregate them by vendor (and cardholder when a column exists). Pure.
 *
 * Column detection is heuristic because every bank exports differently. We
 * only need three things: a description, an amount, and (optionally) a date and
 * cardholder. Rows that do not match an AI vendor are discarded immediately and
 * never leave this function.
 */
import { matchMerchantToCatalog, type CatalogEntry } from "@/lib/ai-catalog";
import { parseCsv } from "./csv";

export interface ExpenseAggregate {
  vendorKey: string;
  vendorName: string;
  toolName: string;
  chargeCount: number;
  totalCents: number;
  /** Estimated recurring monthly cost: total spread over the months observed. */
  monthlyCents: number;
  firstChargeAt: Date | null;
  lastChargeAt: Date | null;
  cardholder: string | null;
  caution?: string;
}

export interface ExpenseParseResult {
  rowsScanned: number;
  matches: ExpenseAggregate[];
  columns: { description: number; amount: number; date: number | null; cardholder: number | null };
}

const DESCRIPTION_PATTERNS = [/^desc/i, /memo/i, /merchant/i, /payee/i, /^name$/i, /details?/i, /narrative/i, /transaction/i, /vendor/i];
const AMOUNT_PATTERNS = [/^amount/i, /debit/i, /charge/i, /total/i, /^sum$/i, /spent/i];
const DATE_PATTERNS = [/date/i, /posted/i, /^when$/i];
const CARDHOLDER_PATTERNS = [/card ?holder/i, /employee/i, /^user$/i, /member/i, /^owner$/i, /purchaser/i, /^name on card/i];

function findColumn(header: string[], patterns: RegExp[], exclude: Set<number>): number | null {
  for (const p of patterns) {
    const idx = header.findIndex((h, i) => !exclude.has(i) && p.test(h.trim()));
    if (idx !== -1) return idx;
  }
  return null;
}

export function parseAmountCents(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[$€£,\s]/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return negative ? -cents : cents;
}

export function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  // ISO first
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // US m/d/yyyy or m/d/yy
  const us = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/.exec(s);
  if (us) {
    const year = us[3].length === 2 ? 2000 + +us[3] : +us[3];
    const d = new Date(Date.UTC(year, +us[1] - 1, +us[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const generic = new Date(s);
  return Number.isNaN(generic.getTime()) ? null : generic;
}

function monthsSpanned(first: Date | null, last: Date | null): number {
  if (!first || !last) return 1;
  const months =
    (last.getUTCFullYear() - first.getUTCFullYear()) * 12 +
    (last.getUTCMonth() - first.getUTCMonth()) +
    1;
  return Math.max(1, months);
}

export function matchExpenses(csvText: string): ExpenseParseResult {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { rowsScanned: 0, matches: [], columns: { description: -1, amount: -1, date: null, cardholder: null } };
  }
  const header = rows[0].map((h) => h.trim());
  const used = new Set<number>();
  const description = findColumn(header, DESCRIPTION_PATTERNS, used);
  if (description === null) throw new Error("Could not find a description or merchant column");
  used.add(description);
  const amount = findColumn(header, AMOUNT_PATTERNS, used);
  if (amount === null) throw new Error("Could not find an amount column");
  used.add(amount);
  const date = findColumn(header, DATE_PATTERNS, used);
  if (date !== null) used.add(date);
  const cardholder = findColumn(header, CARDHOLDER_PATTERNS, used);

  type Acc = ExpenseAggregate & { entry: CatalogEntry };
  const groups = new Map<string, Acc>();

  for (const row of rows.slice(1)) {
    const desc = row[description] ?? "";
    const entry = matchMerchantToCatalog(desc);
    if (!entry) continue;
    const cents = parseAmountCents(row[amount] ?? "");
    if (cents === null || cents <= 0) continue; // refunds/credits ignored
    const when = date !== null ? parseDate(row[date] ?? "") : null;
    const holder = cardholder !== null ? (row[cardholder] ?? "").trim() || null : null;
    const groupKey = `${entry.key}::${holder ?? ""}`;

    const acc =
      groups.get(groupKey) ??
      ({
        entry,
        vendorKey: entry.key,
        vendorName: entry.vendor,
        toolName: entry.name,
        chargeCount: 0,
        totalCents: 0,
        monthlyCents: 0,
        firstChargeAt: null,
        lastChargeAt: null,
        cardholder: holder,
        caution: entry.caution,
      } satisfies Acc);
    acc.chargeCount += 1;
    acc.totalCents += cents;
    if (when) {
      if (!acc.firstChargeAt || when < acc.firstChargeAt) acc.firstChargeAt = when;
      if (!acc.lastChargeAt || when > acc.lastChargeAt) acc.lastChargeAt = when;
    }
    groups.set(groupKey, acc);
  }

  const matches = [...groups.values()]
    .map((acc) => {
      const months = monthsSpanned(acc.firstChargeAt, acc.lastChargeAt);
      const { entry: _entry, ...rest } = acc;
      void _entry;
      return { ...rest, monthlyCents: Math.round(acc.totalCents / months) };
    })
    .sort((a, b) => b.totalCents - a.totalCents);

  return {
    rowsScanned: rows.length - 1,
    matches,
    columns: { description, amount, date, cardholder },
  };
}

export function summarizeExpenses(matches: ExpenseAggregate[]) {
  const monthlyCents = matches.reduce((n, m) => n + m.monthlyCents, 0);
  const totalCents = matches.reduce((n, m) => n + m.totalCents, 0);
  const vendors = new Set(matches.map((m) => m.vendorKey)).size;
  const seats = matches.filter((m) => m.cardholder).length;
  return { monthlyCents, totalCents, vendors, seats };
}
