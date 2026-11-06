import { describe, expect, it } from "vitest";
import { formatCents, priceFor } from "./pricing";

describe("priceFor", () => {
  const rule = { unitCents: 1000, minimumCents: 25000 };
  it("applies the minimum for small teams", () => {
    const p = priceFor(10, rule);
    expect(p.subtotalCents).toBe(10000);
    expect(p.minimumApplied).toBe(true);
    expect(p.totalCents).toBe(25000);
  });
  it("charges per employee above the minimum", () => {
    const p = priceFor(60, rule);
    expect(p.minimumApplied).toBe(false);
    expect(p.totalCents).toBe(60000);
  });
  it("never prices below one employee", () => {
    expect(priceFor(0, rule).employeeCount).toBe(1);
  });
});

describe("formatCents", () => {
  it("formats whole and fractional dollars", () => {
    expect(formatCents(25000)).toBe("$250");
    expect(formatCents(1699)).toBe("$16.99");
  });
});
