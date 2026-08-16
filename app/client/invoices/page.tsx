"use client";

import * as React from "react";
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Building2,
  Download,
  CreditCard,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useClientPortalInvoices,
  useClientPortalInvoice,
} from "@/hooks/use-client-portal";
import { formatINR } from "@/lib/money";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  sent: { label: "Payment Due", variant: "secondary" },
  partially_paid: { label: "Partially Paid", variant: "secondary" },
  paid: { label: "Paid in Full", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
};

export default function ClientInvoicesPage() {
  const { data: invoices = [], isLoading } = useClientPortalInvoices();
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);
  const { data: detailInvoice } = useClientPortalInvoice(selectedInvoiceId ?? "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
          <Receipt className="size-6 text-primary" />
          Invoices & Statements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View tax invoices, check outstanding balances, and access bank transfer details.
        </p>
      </div>

      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center">
            <Receipt className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-display font-medium text-foreground">No invoices yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Your invoices and billing statements from the agency will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {invoices.map((inv: any) => {
              const statusCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.sent;

              return (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {inv.invoiceNumber || "INV"}
                      </span>
                      {inv.projectName && (
                        <span className="text-xs text-muted-foreground font-medium">
                          ({inv.projectName})
                        </span>
                      )}
                      <Badge variant={statusCfg.variant} className="text-xs">
                        {statusCfg.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {inv.issueDate && (
                        <span>Issued: {format(parseISO(inv.issueDate), "MMM d, yyyy")}</span>
                      )}
                      {inv.dueDate && (
                        <span>Due: {format(parseISO(inv.dueDate), "MMM d, yyyy")}</span>
                      )}
                      <span className="font-bold text-foreground">
                        Total: {formatINR(inv.total)}
                      </span>
                      {inv.balanceDue > 0 ? (
                        <span className="text-warning font-semibold">
                          Balance Due: {formatINR(inv.balanceDue)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Settled</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedInvoiceId(inv.id)}
                    >
                      View Invoice Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Invoice Detail & Bank Transfer Modal */}
      {detailInvoice && (
        <Dialog
          open={!!selectedInvoiceId}
          onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div>
                <DialogTitle className="text-xl font-bold font-mono">
                  {detailInvoice.invoiceNumber || "Tax Invoice"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Issued {detailInvoice.issueDate ? format(parseISO(detailInvoice.issueDate), "MMMM d, yyyy") : ""}
                </p>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Line Items Table */}
              <div className="rounded-xl border overflow-hidden bg-card">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-foreground">
                    {detailInvoice.items?.map((it: any) => (
                      <tr key={it.id}>
                        <td className="p-3 font-medium">{it.description}</td>
                        <td className="p-3 text-center text-muted-foreground">{it.quantity}</td>
                        <td className="p-3 text-right text-muted-foreground">{formatINR(it.rate)}</td>
                        <td className="p-3 text-right font-medium">{formatINR(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="p-4 rounded-xl border bg-muted/30 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatINR(detailInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (GST)</span>
                  <span>{formatINR(detailInvoice.taxTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-2 border-t">
                  <span>Total Payable</span>
                  <span className="text-primary">{formatINR(detailInvoice.total)}</span>
                </div>
                {detailInvoice.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 pt-1">
                    <span>Paid Amount</span>
                    <span>- {formatINR(detailInvoice.paidAmount)}</span>
                  </div>
                )}
                {detailInvoice.balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-sm text-warning pt-1 border-t">
                    <span>Balance Due</span>
                    <span>{formatINR(detailInvoice.balanceDue)}</span>
                  </div>
                )}
              </div>

              {/* Payment Transfer Instructions */}
              {detailInvoice.bankDetails && (
                <div className="p-4 rounded-xl bg-card border space-y-1.5 text-xs">
                  <span className="font-semibold text-foreground uppercase text-[10px] tracking-wider block">
                    Bank Transfer Details (NEFT / RTGS / UPI)
                  </span>
                  <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
                    {detailInvoice.bankDetails}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
