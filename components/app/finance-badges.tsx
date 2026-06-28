import { cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/api/types";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/constants/finance-options";

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

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
