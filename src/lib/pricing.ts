/**
 * Per-employee pricing with a minimum. Pure. Defaults live in the
 * OperatorSettings model; this just does the arithmetic.
 */
export interface PriceRule {
  unitCents: number;
  minimumCents: number;
}

export interface PriceBreakdown {
  employeeCount: number;
  unitCents: number;
  subtotalCents: number;
  minimumCents: number;
  totalCents: number;
  minimumApplied: boolean;
}

export function priceFor(employeeCount: number, rule: PriceRule): PriceBreakdown {
  const count = Math.max(1, Math.floor(employeeCount));
  const subtotalCents = count * rule.unitCents;
  const minimumApplied = subtotalCents < rule.minimumCents;
  return {
    employeeCount: count,
    unitCents: rule.unitCents,
    subtotalCents,
    minimumCents: rule.minimumCents,
    totalCents: minimumApplied ? rule.minimumCents : subtotalCents,
    minimumApplied,
  };
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

// Prices are set by the operator in Settings; nothing is charged until they are.
export const DEFAULT_PRICING = {
  auditPricePerEmployeeCents: 0,
  auditMinimumCents: 0,
  monitoringPricePerEmployeeCents: 0,
  monitoringMinimumCents: 0,
} as const;
