"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Send,
  Ban,
  Printer,
  Banknote,
  Trash2,
  FolderKanban,
  Plus,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { GlassCard } from "@/components/app/glass-card";
import { InvoiceStatusBadge } from "@/components/app/finance-badges";
import { InvoicePrint } from "@/components/app/invoice-print";
import { RecordPaymentDialog } from "@/components/app/record-payment-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useInvoice,
  useSendInvoice,
  useCancelInvoice,
  useDeletePayment,
} from "@/hooks/use-invoices";
import { useDisclosure } from "@/hooks/use-disclosure";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import { formatINR } from "@/lib/money";

/** Big headline figure (Total / Paid / Due). */
function MoneyStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "destructive";
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "font-display text-2xl font-semibold tabular-nums " +
          (tone === "success"
            ? "text-success"
            : tone === "destructive"
              ? "text-destructive"
              : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = React.use(params);
  const router = useRouter();
  const { data: invoice, isLoading, error } = useInvoice(invoiceId);

  const send = useSendInvoice();
  const cancel = useCancelInvoice();
  const deletePayment = useDeletePayment(invoiceId);
  const paymentDialog = useDisclosure();
  const cancelDialog = useDisclosure();

  if (isLoading) {
    return (
      <div className="space-y-6" data-print-hide>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6" data-print-hide>
        <PageHeader
          breadcrumbs={[
            { label: "Finance", href: "/finance" },
            { label: "Invoices", href: "/finance/invoices" },
            { label: "Invoice" },
          ]}
          title="Invoice not found"
          description="This invoice may have been removed or you don't have access."
        />
        <Button asChild variant="outline">
          <Link href="/finance/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  const items = invoice.items ?? [];
  const payments = invoice.payments ?? [];
  const canEdit = invoice.status === "draft" || invoice.status === "sent";
  const canCancel =
    invoice.status !== "cancelled" && invoice.status !== "paid";

  const onSend = () =>
    send.mutate(invoice.id, {
      onSuccess: () => toast.success("Invoice sent to client"),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Couldn't send"),
    });

  const onConfirmCancel = () =>
    cancel.mutate(invoice.id, {
      onSuccess: () => {
        toast.success("Invoice cancelled");
        cancelDialog.onClose();
      },
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Couldn't cancel"),
    });

  const onDeletePayment = (paymentId: string) =>
    deletePayment.mutate(paymentId, {
      onSuccess: () => toast.success("Payment removed"),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Couldn't remove"),
    });

  return (
    <>
      {/* Print-only clean layout */}
      <InvoicePrint invoice={invoice} />

      {/* Screen UI */}
      <div className="space-y-6" data-print-hide>
        <PageHeader
          breadcrumbs={[
            { label: "Finance", href: "/finance" },
            { label: "Invoices", href: "/finance/invoices" },
            { label: invoice.invoiceNumber },
          ]}
          title={
            <span className="flex flex-wrap items-center gap-3">
              <span className="font-display">{invoice.invoiceNumber}</span>
              <InvoiceStatusBadge status={invoice.status} />
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/clients/${invoice.clientId}`}
                className="text-primary hover:underline"
              >
                {invoice.clientName}
              </Link>
              {invoice.projectId && invoice.projectName && (
                <>
                  <span className="opacity-40">•</span>
                  <Link
                    href={`/projects/${invoice.projectId}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <FolderKanban className="size-3" />
                    {invoice.projectName}
                  </Link>
                </>
              )}
              <span className="opacity-40">•</span>
              <span>
                Issued {invoice.issueDate ? formatDate(invoice.issueDate) : "—"}
              </span>
              <span className="opacity-40">•</span>
              <span>Due {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</span>
            </span>
          }
          actions={
            <>
              {invoice.status === "draft" && (
                <Button onClick={onSend} disabled={send.isPending}>
                  <Send className="size-4" /> Send
                </Button>
              )}
              {invoice.status !== "cancelled" && (
                <Button onClick={() => paymentDialog.onOpen()}>
                  <Banknote className="size-4" /> Record payment
                </Button>
              )}
              {canEdit && (
                <Button asChild variant="outline">
                  <Link href={`/finance/invoices/${invoice.id}/edit`}>
                    <Pencil className="size-4" /> Edit
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" /> Print / PDF
              </Button>
              {canCancel && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => cancelDialog.onOpen()}
                >
                  <Ban className="size-4" /> Cancel
                </Button>
              )}
            </>
          }
        />

        {/* Money headline */}
        <GlassCard className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MoneyStat label="Total" value={formatINR(invoice.total)} />
            <MoneyStat
              label="Paid"
              value={formatINR(invoice.amountPaid)}
              tone="success"
            />
            <MoneyStat
              label="Balance due"
              value={formatINR(invoice.amountDue)}
              tone={invoice.amountDue > 0 ? "destructive" : "default"}
            />
          </div>
        </GlassCard>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Line items */}
          <GlassCard className="p-5">
            <h2 className="mb-3 font-display text-base font-semibold">
              Line items
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wide">
                      Description
                    </TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wide">
                      Qty
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wide">
                      Unit
                    </TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wide">
                      Rate
                    </TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wide">
                      GST%
                    </TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wide">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id} className="hover:bg-transparent">
                      <TableCell className="font-medium">
                        {it.description}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {it.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {it.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(it.rate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {it.gstRate}%
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatINR(it.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </GlassCard>

          {/* Totals breakdown */}
          <GlassCard className="p-5">
            <h2 className="mb-3 font-display text-base font-semibold">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatINR(invoice.subtotal)}</dd>
              </div>
              {invoice.isInterstate ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">IGST</dt>
                  <dd className="tabular-nums">{formatINR(invoice.igst)}</dd>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">CGST</dt>
                    <dd className="tabular-nums">{formatINR(invoice.cgst)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">SGST</dt>
                    <dd className="tabular-nums">{formatINR(invoice.sgst)}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t pt-2 font-display text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums text-primary">
                  {formatINR(invoice.total)}
                </dd>
              </div>
            </dl>

            {(invoice.notes || invoice.terms || invoice.bankDetails) && (
              <div className="mt-5 space-y-3 border-t pt-4 text-xs text-muted-foreground">
                {invoice.notes && (
                  <div>
                    <p className="font-semibold text-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <p className="font-semibold text-foreground">
                      Terms &amp; conditions
                    </p>
                    <p className="whitespace-pre-wrap">{invoice.terms}</p>
                  </div>
                )}
                {invoice.bankDetails && (
                  <div>
                    <p className="font-semibold text-foreground">Bank details</p>
                    <p className="whitespace-pre-wrap">{invoice.bankDetails}</p>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Payments */}
        <GlassCard className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Payments</h2>
            {invoice.status !== "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => paymentDialog.onOpen()}
              >
                <Plus className="size-4" /> Record payment
              </Button>
            )}
          </div>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Date
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Method
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide">
                    Reference
                  </TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wide">
                    Amount
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-transparent">
                    <TableCell>{formatDate(p.paidAt)}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {p.method ? p.method.replace(/_/g, " ") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.reference || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatINR(p.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeletePayment(p.id)}
                        disabled={deletePayment.isPending}
                        aria-label="Remove payment"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>
      </div>

      <RecordPaymentDialog
        open={paymentDialog.open}
        onOpenChange={paymentDialog.setOpen}
        invoiceId={invoice.id}
        amountDue={invoice.amountDue}
      />

      <Dialog open={cancelDialog.open} onOpenChange={cancelDialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {invoice.invoiceNumber}?</DialogTitle>
            <DialogDescription>
              This marks the invoice as cancelled. It stays on record but is no
              longer counted as outstanding revenue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => cancelDialog.onClose()}
              disabled={cancel.isPending}
            >
              Keep invoice
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmCancel}
              disabled={cancel.isPending}
            >
              Cancel invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
