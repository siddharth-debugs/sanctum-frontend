"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  NumberField,
  DateField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/fields";
import { useAddPayment } from "@/hooks/use-invoices";
import { ApiError } from "@/lib/api/client";
import { toPaise, fromPaise, formatINR } from "@/lib/money";

const PAYMENT_METHOD_OPTIONS = [
  { label: "Bank transfer", value: "bank_transfer" },
  { label: "UPI", value: "upi" },
  { label: "Card", value: "card" },
  { label: "Cash", value: "cash" },
  { label: "Cheque", value: "cheque" },
  { label: "Other", value: "other" },
];

const paymentSchema = z.object({
  amount: z.number().positive("Enter an amount"),
  paidAt: z.date().optional(),
  method: z.string().optional().or(z.literal("")),
  reference: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  amountDue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  /** Outstanding amount in paise, prefilled into the amount field. */
  amountDue: number;
}) {
  const addPayment = useAddPayment(invoiceId);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: undefined,
      paidAt: new Date(),
      method: "bank_transfer",
      reference: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        amount: amountDue > 0 ? fromPaise(amountDue) : undefined,
        paidAt: new Date(),
        method: "bank_transfer",
        reference: "",
        notes: "",
      });
    }
  }, [open, amountDue, form]);

  const onSubmit = (values: PaymentFormValues) => {
    addPayment.mutate(
      {
        amount: toPaise(values.amount),
        paidAt: values.paidAt ? values.paidAt.toISOString() : null,
        method: values.method || null,
        reference: values.reference || null,
        notes: values.notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Payment recorded");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't record payment",
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="font-display">Record payment</DialogTitle>
          <DialogDescription>
            {amountDue > 0
              ? `Outstanding balance: ${formatINR(amountDue)}`
              : "This invoice is fully paid."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id="payment-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField
                control={form.control}
                name="amount"
                label="Amount"
                placeholder="0.00"
                min={0}
                step={0.01}
                prefix="₹"
                required
              />
              <DateField
                control={form.control}
                name="paidAt"
                label="Paid date"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name="method"
                label="Method"
                placeholder="Select method"
                options={PAYMENT_METHOD_OPTIONS}
              />
              <TextField
                control={form.control}
                name="reference"
                label="Reference"
                placeholder="Txn / UTR / cheque no."
              />
            </div>
            <TextareaField
              control={form.control}
              name="notes"
              label="Notes"
              placeholder="Optional note."
              rows={2}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={addPayment.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="payment-form" disabled={addPayment.isPending}>
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
