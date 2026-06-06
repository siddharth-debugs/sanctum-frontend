import type { SelectOption } from "@/components/fields";
import type { InvoiceStatus, ExpenseCategory } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Invoice status
// ---------------------------------------------------------------------------

export const INVOICE_STATUS_OPTIONS: SelectOption[] = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Partially paid", value: "partially_paid" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
];

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

/**
 * Evergreen-token pill classes per status:
 * paid → success, overdue → destructive, sent → primary,
 * partially_paid → warning, draft/cancelled → muted.
 */
export const INVOICE_STATUS_CLASS: Record<InvoiceStatus, string> = {
  draft:
    "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]",
  sent: "text-primary bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
  partially_paid:
    "text-warning bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]",
  paid: "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]",
  overdue:
    "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
  cancelled:
    "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]",
};

// ---------------------------------------------------------------------------
// Expense category
// ---------------------------------------------------------------------------

export const EXPENSE_CATEGORY_OPTIONS: SelectOption[] = [
  { label: "Software", value: "software" },
  { label: "Salaries", value: "salaries" },
  { label: "Marketing", value: "marketing" },
  { label: "Travel", value: "travel" },
  { label: "Office", value: "office" },
  { label: "Equipment", value: "equipment" },
  { label: "Contractor", value: "contractor" },
  { label: "Taxes", value: "taxes" },
  { label: "Utilities", value: "utilities" },
  { label: "Other", value: "other" },
];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  software: "Software",
  salaries: "Salaries",
  marketing: "Marketing",
  travel: "Travel",
  office: "Office",
  equipment: "Equipment",
  contractor: "Contractor",
  taxes: "Taxes",
  utilities: "Utilities",
  other: "Other",
};

// ---------------------------------------------------------------------------
// Line-item helpers
// ---------------------------------------------------------------------------

/** Units a line item can be billed in. */
export const INVOICE_UNIT_OPTIONS: SelectOption[] = [
  { label: "Piece", value: "piece" },
  { label: "Hour", value: "hour" },
  { label: "Day", value: "day" },
  { label: "Month", value: "month" },
  { label: "Project", value: "project" },
  { label: "Unit", value: "unit" },
  { label: "Word", value: "word" },
];

/** GST rate options (percent). */
export const GST_RATE_OPTIONS: SelectOption[] = [
  { label: "0%", value: "0" },
  { label: "5%", value: "5" },
  { label: "12%", value: "12" },
  { label: "18%", value: "18" },
  { label: "28%", value: "28" },
];
