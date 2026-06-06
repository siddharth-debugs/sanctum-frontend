import { z } from "zod";
import type { ExpenseCategory } from "@/lib/api/types";

export const EXPENSE_CATEGORY_VALUES = [
  "software",
  "salaries",
  "marketing",
  "travel",
  "office",
  "equipment",
  "contractor",
  "taxes",
  "utilities",
  "other",
] as const satisfies readonly ExpenseCategory[];

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORY_VALUES),
  /** rupees in the form; converted to paise on submit */
  amount: z.number().positive("Enter an amount"),
  description: z.string().max(2000).optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  expenseDate: z.date().optional(),
  receiptUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  gstDeductible: z.boolean(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
