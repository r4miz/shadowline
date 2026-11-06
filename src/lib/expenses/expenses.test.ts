import { describe, expect, it } from "vitest";
import { CsvLimitError, parseCsv } from "./csv";
import { matchExpenses, parseAmountCents, parseDate, summarizeExpenses } from "./match";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded commas and CRLF", () => {
    const rows = parseCsv('a,b,c\r\n"x, y","he said ""hi""",3\r\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["x, y", 'he said "hi"', "3"],
    ]);
  });
  it("strips a BOM and skips blank lines", () => {
    const rows = parseCsv("﻿h1,h2\n\n1,2\n");
    expect(rows).toEqual([["h1", "h2"], ["1", "2"]]);
  });
  it("enforces the row limit", () => {
    const big = Array.from({ length: 50 }, (_, i) => `${i},x`).join("\n");
    expect(() => parseCsv(big, 10)).toThrow(CsvLimitError);
  });
});

describe("parseAmountCents / parseDate", () => {
  it("parses currency, negatives and parentheses", () => {
    expect(parseAmountCents("$20.00")).toBe(2000);
    expect(parseAmountCents("1,234.5")).toBe(123450);
    expect(parseAmountCents("(20.00)")).toBe(-2000);
    expect(parseAmountCents("-20")).toBe(-2000);
    expect(parseAmountCents("abc")).toBeNull();
  });
  it("parses ISO and US dates", () => {
    expect(parseDate("2026-03-05")?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(parseDate("3/5/26")?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(parseDate("nope")).toBeNull();
  });
});

const STATEMENT = `Transaction Date,Description,Cardholder,Amount
2026-01-03,OPENAI *CHATGPT SUBSCR,Ava Example,20.00
2026-02-03,OPENAI *CHATGPT SUBSCR,Ava Example,20.00
2026-03-03,OPENAI *CHATGPT SUBSCR,Ava Example,20.00
2026-01-09,OPENAI *CHATGPT SUBSCR,Ben Example,20.00
2026-01-12,OTTER.AI PRO,Chloe Example,16.99
2026-01-15,STAPLES STORE 1234,Dan Example,45.10
2026-02-20,ANTHROPIC CLAUDE.AI,Ben Example,20.00
2026-02-21,OPENAI *CHATGPT REFUND,Ben Example,-20.00
`;

describe("matchExpenses", () => {
  it("finds AI vendors, aggregates per vendor+cardholder, ignores others and refunds", () => {
    const result = matchExpenses(STATEMENT);
    expect(result.rowsScanned).toBe(8);
    const keys = result.matches.map((m) => `${m.vendorKey}:${m.cardholder}`);
    expect(keys).toContain("chatgpt:Ava Example");
    expect(keys).toContain("chatgpt:Ben Example");
    expect(keys).toContain("meeting_notetaker:Chloe Example");
    expect(keys).toContain("claude:Ben Example");
    expect(keys.some((k) => k.startsWith("other"))).toBe(false);

    const ava = result.matches.find((m) => m.cardholder === "Ava Example")!;
    expect(ava.chargeCount).toBe(3);
    expect(ava.totalCents).toBe(6000);
    expect(ava.monthlyCents).toBe(2000); // 6000 over 3 months
    expect(ava.firstChargeAt?.toISOString()).toBe("2026-01-03T00:00:00.000Z");

    const ben = result.matches.find((m) => m.vendorKey === "chatgpt" && m.cardholder === "Ben Example")!;
    expect(ben.chargeCount).toBe(1); // refund ignored
  });
  it("summarizes monthly spend", () => {
    const { matches } = matchExpenses(STATEMENT);
    const s = summarizeExpenses(matches);
    expect(s.vendors).toBe(3);
    expect(s.monthlyCents).toBeGreaterThan(5000);
  });
  it("throws a clear error when no description column exists", () => {
    expect(() => matchExpenses("Foo,Bar\n1,2\n")).toThrow(/description/i);
  });
  it("works without date or cardholder columns", () => {
    const r = matchExpenses("Memo,Debit\nOPENAI CHATGPT,20\nGRAMMARLY,12\n");
    expect(r.matches).toHaveLength(2);
    expect(r.matches[0].cardholder).toBeNull();
    expect(r.matches[0].monthlyCents).toBe(r.matches[0].totalCents);
  });
});
