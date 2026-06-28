import type { SelectOption } from "@/components/fields";
import type { ExpenseCategory } from "@/lib/api/types";

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
