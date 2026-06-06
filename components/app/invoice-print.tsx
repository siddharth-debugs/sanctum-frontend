"use client";

import { formatDate } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import { INVOICE_STATUS_LABEL } from "@/lib/constants/finance-options";
import type { Invoice } from "@/lib/api/types";

/**
 * Clean, print-only invoice layout. Hidden on screen (`hidden print:block`) and
 * the surrounding app chrome is hidden via a global `@media print` rule, so
 * window.print() yields a tidy A4 invoice.
 */
export function InvoicePrint({ invoice }: { invoice: Invoice }) {
  const items = invoice.items ?? [];
  return (
    <div className="hidden text-black print:block">
      <div className="mx-auto max-w-3xl p-8 text-sm">
        <header className="flex items-start justify-between border-b border-gray-300 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
            <p className="mt-1 font-mono text-gray-600">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>
              <span className="font-semibold text-gray-800">Status:</span>{" "}
              {INVOICE_STATUS_LABEL[invoice.status]}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Issued:</span>{" "}
              {invoice.issueDate ? formatDate(invoice.issueDate) : "—"}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Due:</span>{" "}
              {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
            </p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Bill to
            </p>
            <p className="mt-1 font-semibold">{invoice.clientName}</p>
            {invoice.projectName && (
              <p className="text-gray-600">Project: {invoice.projectName}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Supply
            </p>
            <p className="mt-1">
              {invoice.isInterstate ? "Interstate (IGST)" : "Intrastate (CGST + SGST)"}
            </p>
            <p className="text-gray-600">Currency: {invoice.currency}</p>
          </div>
        </section>

        <table className="mt-6 w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-gray-300 text-[11px] uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2">Unit</th>
              <th className="py-2 px-2 text-right">Rate</th>
              <th className="py-2 px-2 text-right">GST%</th>
              <th className="py-2 pl-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-gray-200">
                <td className="py-2 pr-2">{it.description}</td>
                <td className="py-2 px-2 text-right tabular-nums">{it.quantity}</td>
                <td className="py-2 px-2">{it.unit}</td>
                <td className="py-2 px-2 text-right tabular-nums">
                  {formatINR(it.rate)}
                </td>
                <td className="py-2 px-2 text-right tabular-nums">{it.gstRate}%</td>
                <td className="py-2 pl-2 text-right tabular-nums">
                  {formatINR(it.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd className="tabular-nums">{formatINR(invoice.subtotal)}</dd>
            </div>
            {invoice.isInterstate ? (
              <div className="flex justify-between">
                <dt className="text-gray-600">IGST</dt>
                <dd className="tabular-nums">{formatINR(invoice.igst)}</dd>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-600">CGST</dt>
                  <dd className="tabular-nums">{formatINR(invoice.cgst)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">SGST</dt>
                  <dd className="tabular-nums">{formatINR(invoice.sgst)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-gray-300 pt-1.5 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(invoice.total)}</dd>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Paid</dt>
                  <dd className="tabular-nums">{formatINR(invoice.amountPaid)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Balance due</dt>
                  <dd className="tabular-nums">{formatINR(invoice.amountDue)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {(invoice.notes || invoice.terms || invoice.bankDetails) && (
          <footer className="mt-8 space-y-3 border-t border-gray-300 pt-4 text-xs text-gray-700">
            {invoice.notes && (
              <div>
                <p className="font-semibold text-gray-800">Notes</p>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="font-semibold text-gray-800">Terms & conditions</p>
                <p className="whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
            {invoice.bankDetails && (
              <div>
                <p className="font-semibold text-gray-800">Bank details</p>
                <p className="whitespace-pre-wrap">{invoice.bankDetails}</p>
              </div>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
