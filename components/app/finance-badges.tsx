import { cn } from "@/lib/utils";
import type { InvoiceStatus, ExpenseCategory } from "@/lib/api/types";
import {
  INVOICE_STATUS_CLASS,
  INVOICE_STATUS_LABEL,
  EXPENSE_CATEGORY_LABEL,
} from "@/lib/constants/finance-options";

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

/** Invoice status pill, Evergreen-tokened per status. */
export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return (
    <span className={cn(pill, INVOICE_STATUS_CLASS[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {INVOICE_STATUS_LABEL[status]}
    </span>
  );
}

/** Neutral accent pill naming an expense category. */
export function ExpenseCategoryBadge({
  category,
  className,
}: {
  category: ExpenseCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        pill,
        "text-accent bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]",
        className,
      )}
    >
      {EXPENSE_CATEGORY_LABEL[category]}
    </span>
  );
}
