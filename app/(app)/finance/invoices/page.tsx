"use client";

import * as React from "react";
import {
  Receipt,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceFormSheet } from "@/components/app/finance/invoice-form-sheet";
import {
  useInvoices,
  useRecordPayment,
} from "@/hooks/use-invoices";
import { useIsOwner } from "../../session-context";
import { formatINR } from "@/lib/money";
import { toast } from "sonner";
import type { Invoice, InvoiceStatus } from "@/lib/api/types";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Draft", variant: "outline" },
  sent: { label: "Sent / Unpaid", variant: "secondary" },
  partially_paid: { label: "Partially Paid", variant: "secondary" },
  paid: { label: "Paid in Full", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function InvoicesPage() {
  const isOwner = useIsOwner();

  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [isPayOpen, setIsPayOpen] = React.useState(false);
  const [payAmountRupees, setPayAmountRupees] = React.useState("");
  const [payMethod, setPayMethod] = React.useState("bank_transfer");
  const [payReference, setPayReference] = React.useState("");
  const [payNotes, setPayNotes] = React.useState("");

  const { data: invoices = [], isLoading } = useInvoices();
  const payMutation = useRecordPayment();

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <PageHeader
          kicker="Restricted"
          title="Invoices & Billing"
          description="Financial statements and tax invoices are restricted strictly to agency owners."
        />
        <GlassCard className="p-8 text-center text-muted-foreground">
          You do not have permission to view or manage agency financials.
        </GlassCard>
      </div>
    );
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !payAmountRupees) {
      toast.error("Payment amount is required");
      return;
    }

    try {
      const amountPaise = Math.round(parseFloat(payAmountRupees) * 100);
      await payMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        amount: amountPaise,
        method: payMethod,
        reference: payReference.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      toast.success("Payment recorded successfully!");
      setIsPayOpen(false);
      setSelectedInvoice(null);
      setPayAmountRupees("");
      setPayReference("");
      setPayNotes("");
    } catch {
      toast.error("Failed to record payment");
    }
  };

  // KPIs
  const totalInvoicedPaise = invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalPaidPaise = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const outstandingPaise = invoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Financials & GST"
        title="Tax Invoices"
        description="Generate GST-compliant tax invoices, track client receivables, and record bank/UPI settlements."
        actions={
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="size-4" /> Create Invoice
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Invoiced"
          value={formatINR(totalInvoicedPaise)}
          icon={Receipt}
          hint="Gross billed across invoices"
        />
        <KpiCard
          label="Collected Revenue"
          value={formatINR(totalPaidPaise)}
          icon={CheckCircle2}
          hint="Settled payments"
        />
        <KpiCard
          label="Outstanding Balance"
          value={formatINR(outstandingPaise)}
          icon={AlertCircle}
          hint="Awaiting payment"
        />
        <KpiCard
          label="Total Statements"
          value={invoices.length}
          icon={Calendar}
          hint="All issued invoices"
        />
      </div>

      {/* Invoices List */}
      {isLoading ? (
        <GlassCard className="p-12 text-center text-sm text-muted-foreground">
          Loading tax invoices...
        </GlassCard>
      ) : invoices.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-12 text-center">
          <Receipt className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-display font-medium text-foreground">No invoices generated yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Generate your first GST tax invoice with custom line items and tax breakdown.
          </p>
          <Button onClick={() => setIsSheetOpen(true)} className="mt-4" size="sm">
            <Plus className="size-4" /> Create Invoice
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const statusMeta = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
            const balanceDue = inv.balanceDue ?? (inv.total - (inv.paidAmount || 0));

            return (
              <GlassCard
                key={inv.id}
                className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors hover:border-primary/40"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {inv.invoiceNumber}
                    </span>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    {inv.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due {format(parseISO(inv.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Building2 className="size-4 text-primary" />
                    <span>{inv.clientName || "Client Account"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {inv.issueDate && (
                      <span>Issued {format(parseISO(inv.issueDate), "MMM d, yyyy")}</span>
                    )}
                    <span>•</span>
                    <span>Subtotal: {formatINR(inv.subtotal)}</span>
                    <span>•</span>
                    <span>GST ({inv.isInterstate ? "IGST" : "CGST+SGST"}): {formatINR(inv.taxTotal)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 flex-wrap self-end md:self-center">
                  <div className="text-right">
                    <span className="text-base font-bold text-foreground block">
                      {formatINR(inv.total)}
                    </span>
                    {balanceDue > 0 ? (
                      <span className="text-xs font-medium text-destructive">
                        Due: {formatINR(balanceDue)}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-500">Fully Paid</span>
                    )}
                  </div>

                  {balanceDue > 0 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setPayAmountRupees(String(Math.round(balanceDue / 100)));
                        setIsPayOpen(true);
                      }}
                    >
                      <CreditCard className="size-3.5" /> Record Payment
                    </Button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Slide-over Invoice Sidebar Sheet */}
      <InvoiceFormSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

      {/* Record Payment Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Client Payment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Amount Received (₹)</Label>
              <Input
                type="number"
                value={payAmountRupees}
                onChange={(e) => setPayAmountRupees(e.target.value)}
                placeholder="e.g. 50000"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</SelectItem>
                  <SelectItem value="upi">UPI / QR</SelectItem>
                  <SelectItem value="credit_card">Card / Payment Gateway</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>UTR / Reference Number</Label>
              <Input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Transaction UTR / Cheque No."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment Notes (Optional)</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Milestone 1 settlement received via HDFC"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={payMutation.isPending}>
                {payMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
