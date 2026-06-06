import { z } from "zod";

export const INVOICE_UNIT_VALUES = [
  "piece",
  "hour",
  "day",
  "month",
  "project",
  "unit",
  "word",
] as const;

export const GST_RATE_VALUES = ["0", "5", "12", "18", "28"] as const;

/** A line item as edited in the form. Rate is in RUPEES here (₹), converted to
 *  paise on submit. */
export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.number().min(0, "≥ 0"),
  unit: z.enum(INVOICE_UNIT_VALUES),
  /** rupees in the form */
  rate: z.number().min(0, "≥ 0"),
  /** GST percent, kept as a string for the SelectField */
  gstRate: z.enum(GST_RATE_VALUES),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Pick a client"),
  projectId: z.string().optional().or(z.literal("")),
  issueDate: z.date().optional(),
  dueDate: z.date().optional(),
  isInterstate: z.boolean(),
  notes: z.string().max(4000).optional().or(z.literal("")),
  terms: z.string().max(4000).optional().or(z.literal("")),
  bankDetails: z.string().max(4000).optional().or(z.literal("")),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});

export type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
