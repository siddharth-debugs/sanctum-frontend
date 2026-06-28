/**
 * Money helpers. ALL money values crossing the API boundary are INTEGER PAISE
 * (₹1 = 100 paise). Convert ₹ inputs → paise on submit with `toPaise`, render
 * with `formatINR`, and only use `fromPaise` when you need a numeric rupee value
 * (e.g. prefilling a ₹ input). Never do float math directly on rupee amounts.
 */

/** Convert a rupee amount (possibly fractional) to integer paise. */
export function toPaise(rupees: number | null | undefined): number {
  if (rupees == null || Number.isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/** Convert integer paise to a rupee number (may be fractional). */
export function fromPaise(paise: number | null | undefined): number {
  if (paise == null || Number.isNaN(paise)) return 0;
  return paise / 100;
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format integer paise as Indian-grouped currency, e.g. 12345600 → "₹1,23,456.00".
 */
export function formatINR(paise: number | null | undefined): string {
  if (paise == null || Number.isNaN(paise)) return "₹0.00";
  return INR.format(paise / 100);
}

/** Compact INR for tight spaces (no decimals), e.g. 12345600 → "₹1,23,456". */
export function formatINRCompact(paise: number | null | undefined): string {
  if (paise == null || Number.isNaN(paise)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

