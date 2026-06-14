"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Send } from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/app/glass-card";
import {
  TextareaField,
  ComboboxField,
  SelectField,
  DatePickerField,
  SwitchField,
} from "@/components/fields";
import {
  invoiceSchema,
  type InvoiceFormValues,
} from "@/lib/schemas/invoice.schema";
import {
  INVOICE_UNIT_OPTIONS,
  GST_RATE_OPTIONS,
} from "@/lib/constants/finance-options";
import {
  useCreateInvoice,
  useUpdateInvoice,
  type InvoiceInput,
} from "@/hooks/use-invoices";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { ApiError } from "@/lib/api/client";
import { toPaise, formatINR, computeInvoiceTotals, lineAmount } from "@/lib/money";
import type { Invoice } from "@/lib/api/types";

const FORM_ID = "invoice-form";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

const EMPTY_LINE: InvoiceFormValues["items"][number] = {
  description: "",
  quantity: 1,
  unit: "piece",
  rate: 0,
  gstRate: "18",
};

/** Live totals panel — recomputes in paise from the watched line items. */
function TotalsPanel({
  control,
}: {
  control: ReturnType<typeof useForm<InvoiceFormValues>>["control"];
}) {
  const items = useWatch({ control, name: "items" }) ?? [];
  const isInterstate = useWatch({ control, name: "isInterstate" }) ?? false;

  const totals = React.useMemo(
    () =>
      computeInvoiceTotals(
        items.map((it) => ({
          quantity: Number(it?.quantity) || 0,
          ratePaise: toPaise(Number(it?.rate) || 0),
          gstRate: Number(it?.gstRate) || 0,
        })),
        !!isInterstate,
      ),
    [items, isInterstate],
  );

  return (
    <GlassCard className="p-5">
      <SectionHeading>Totals</SectionHeading>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium tabular-nums">{formatINR(totals.subtotal)}</dd>
        </div>
        {isInterstate ? (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">IGST</dt>
            <dd className="font-medium tabular-nums">{formatINR(totals.igst)}</dd>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">CGST</dt>
              <dd className="font-medium tabular-nums">{formatINR(totals.cgst)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">SGST</dt>
              <dd className="font-medium tabular-nums">{formatINR(totals.sgst)}</dd>
            </div>
          </>
        )}
        <div className="mt-1 flex items-center justify-between border-t pt-3">
          <dt className="font-display text-base font-semibold">Grand total</dt>
          <dd className="font-display text-lg font-semibold tabular-nums text-primary">
            {formatINR(totals.total)}
          </dd>
        </div>
      </dl>
    </GlassCard>
  );
}

/** Auto-amount cell for a single line (qty × rate). */
function LineAmount({
  control,
  index,
}: {
  control: ReturnType<typeof useForm<InvoiceFormValues>>["control"];
  index: number;
}) {
  const qty = useWatch({ control, name: `items.${index}.quantity` });
  const rate = useWatch({ control, name: `items.${index}.rate` });
  const amount = lineAmount(Number(qty) || 0, toPaise(Number(rate) || 0));
  return (
    <span className="text-sm font-semibold tabular-nums">{formatINR(amount)}</span>
  );
}

export function InvoiceForm({
  invoice,
  initialClientId,
}: {
  /** When present, the form is in edit mode and prefills from the detail. */
  invoice?: Invoice | null;
  /** Preselect a client (e.g. from ?clientId=…) in create mode. */
  initialClientId?: string;
}) {
  const router = useRouter();
  const isEdit = !!invoice;
  const create = useCreateInvoice();
  const update = useUpdateInvoice(invoice?.id ?? "");

  const { data: clients } = useClients();
  const { data: projects } = useProjects();

  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: invoice?.clientId ?? initialClientId ?? "",
      projectId: invoice?.projectId ?? "",
      issueDate: invoice?.issueDate ? new Date(invoice.issueDate) : new Date(),
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : undefined,
      isInterstate: invoice ? invoice.isInterstate === 1 : false,
      notes: invoice?.notes ?? "",
      terms: invoice?.terms ?? "",
      bankDetails: invoice?.bankDetails ?? "",
      items:
        invoice?.items && invoice.items.length > 0
          ? invoice.items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unit: (it.unit as InvoiceFormValues["items"][number]["unit"]) ?? "piece",
              rate: it.rate / 100, // paise → rupees for the form
              gstRate: String(
                it.gstRate,
              ) as InvoiceFormValues["items"][number]["gstRate"],
            }))
          : [{ ...EMPTY_LINE }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Restrict the project picker to the chosen client's projects.
  const selectedClientId = useWatch({ control: form.control, name: "clientId" });
  const projectOptions = React.useMemo(
    () =>
      (projects ?? [])
        .filter((p) => !selectedClientId || p.clientId === selectedClientId)
        .map((p) => ({ label: p.name, value: p.id })),
    [projects, selectedClientId],
  );

  const buildPayload = (
    values: InvoiceFormValues,
    status: "draft" | "sent",
  ): InvoiceInput => ({
    clientId: values.clientId,
    projectId: values.projectId || null,
    issueDate: values.issueDate ? values.issueDate.toISOString() : null,
    dueDate: values.dueDate ? values.dueDate.toISOString() : null,
    isInterstate: values.isInterstate ? 1 : 0,
    currency: "INR",
    notes: values.notes || null,
    terms: values.terms || null,
    bankDetails: values.bankDetails || null,
    status,
    items: values.items.map((it) => ({
      description: it.description,
      quantity: Number(it.quantity) || 0,
      unit: it.unit,
      rate: toPaise(Number(it.rate) || 0),
      gstRate: Number(it.gstRate) || 0,
    })),
  });

  const submit = (status: "draft" | "sent") =>
    form.handleSubmit((values) => {
      const payload = buildPayload(values, status);
      const mutation = isEdit ? update : create;
      mutation.mutate(payload, {
        onSuccess: (saved) => {
          toast.success(
            isEdit
              ? "Invoice updated"
              : status === "sent"
                ? "Invoice created and sent"
                : "Draft saved",
          );
          router.push(`/finance/invoices/${saved.id}`);
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't save the invoice",
          );
        },
      });
    })();

  const pending = create.isPending || update.isPending;

  return (
    <Form {...form}>
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          submit("draft");
        }}
        className="space-y-6"
      >
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Left: parties + meta */}
          <div className="space-y-6">
            <GlassCard className="p-5">
              <SectionHeading>Bill to</SectionHeading>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ComboboxField
                    control={form.control}
                    name="clientId"
                    label="Client"
                    placeholder="Select client"
                    options={clientOptions}
                    required
                  />
                  <ComboboxField
                    control={form.control}
                    name="projectId"
                    label="Project"
                    placeholder="Select project (optional)"
                    options={projectOptions}
                    emptyText="No projects for this client."
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DatePickerField
                    control={form.control}
                    name="issueDate"
                    label="Issue date"
                  />
                  <DatePickerField
                    control={form.control}
                    name="dueDate"
                    label="Due date"
                  />
                </div>
                <SwitchField
                  control={form.control}
                  name="isInterstate"
                  label="Interstate supply (IGST)"
                  description="On for a different state (IGST). Off splits tax into CGST + SGST."
                />
              </div>
            </GlassCard>

            {/* Line items */}
            <GlassCard className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <SectionHeading>Line items</SectionHeading>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ ...EMPTY_LINE })}
                >
                  <Plus className="size-4" /> Add line item
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="w-[36%] px-2 text-left">Description</th>
                      <th className="px-2 text-left">Qty</th>
                      <th className="px-2 text-left">Unit</th>
                      <th className="px-2 text-left">Rate ₹</th>
                      <th className="px-2 text-left">GST%</th>
                      <th className="px-2 text-right">Amount</th>
                      <th className="w-8 px-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="align-top">
                        <td className="px-2">
                          <input
                            {...form.register(`items.${index}.description`)}
                            placeholder="Service or item"
                            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                          {form.formState.errors.items?.[index]?.description && (
                            <p className="mt-1 text-[11px] text-destructive">
                              {form.formState.errors.items[index]?.description?.message}
                            </p>
                          )}
                        </td>
                        <td className="px-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            {...form.register(`items.${index}.quantity`, {
                              valueAsNumber: true,
                            })}
                            className="h-9 w-20 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                        </td>
                        <td className="px-2">
                          <select
                            {...form.register(`items.${index}.unit`)}
                            className="h-9 w-28 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            {INVOICE_UNIT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            {...form.register(`items.${index}.rate`, {
                              valueAsNumber: true,
                            })}
                            className="h-9 w-28 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                        </td>
                        <td className="px-2">
                          <select
                            {...form.register(`items.${index}.gstRate`)}
                            className="h-9 w-20 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            {GST_RATE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 pt-2 text-right">
                          <LineAmount control={form.control} index={index} />
                        </td>
                        <td className="px-1 pt-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                            aria-label="Remove line item"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {typeof form.formState.errors.items?.message === "string" && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <SectionHeading>Notes &amp; terms</SectionHeading>
              <div className="space-y-5">
                <TextareaField
                  control={form.control}
                  name="notes"
                  label="Notes"
                  placeholder="Anything the client should know."
                  rows={2}
                />
                <TextareaField
                  control={form.control}
                  name="terms"
                  label="Terms & conditions"
                  placeholder="Payment terms, late fees, etc."
                  rows={2}
                />
                <TextareaField
                  control={form.control}
                  name="bankDetails"
                  label="Bank details"
                  placeholder="Account name, number, IFSC, UPI."
                  rows={2}
                />
              </div>
            </GlassCard>
          </div>

          {/* Right: sticky totals + actions */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <TotalsPanel control={form.control} />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => submit("sent")}
                disabled={pending}
              >
                <Send className="size-4" /> Send to client
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => submit("draft")}
                disabled={pending}
              >
                <FileText className="size-4" /> Save draft
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
