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

/** One computed line: amount = round(quantity × ratePaise) in paise. */
export interface ComputedLine {
  /** paise */
  amount: number;
  /** paise */
  tax: number;
}

/** Aggregate invoice totals computed client-side in PAISE to mirror the backend.
 *  Tax is split CGST/SGST (each = round(tax/2)) unless interstate → all IGST. */
export interface InvoiceTotals {
  subtotal: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

/**
 * Compute invoice totals from line inputs. Quantity is a plain number, rate is
 * PAISE, gstRate is a percent number. Mirrors the server: per-line amount =
 * round(qty × ratePaise); per-line tax = round(amount × gstRate / 100); the
 * tax total is then split CGST/SGST (round half each) or all IGST if interstate.
 */
export function computeInvoiceTotals(
  lines: Array<{ quantity: number; ratePaise: number; gstRate: number }>,
  isInterstate: boolean,
): InvoiceTotals {
  let subtotal = 0;
  let taxTotal = 0;
  for (const l of lines) {
    const amount = Math.round((l.quantity || 0) * (l.ratePaise || 0));
    const tax = Math.round((amount * (l.gstRate || 0)) / 100);
    subtotal += amount;
    taxTotal += tax;
  }
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (isInterstate) {
    igst = taxTotal;
  } else {
    cgst = Math.round(taxTotal / 2);
    sgst = taxTotal - cgst;
  }
  return { subtotal, taxTotal, cgst, sgst, igst, total: subtotal + taxTotal };
}

/** Single line amount in paise: round(quantity × ratePaise). */
export function lineAmount(quantity: number, ratePaise: number): number {
  return Math.round((quantity || 0) * (ratePaise || 0));
}
