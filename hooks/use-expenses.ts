"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Expense, ExpenseCategory } from "@/lib/api/types";

export interface ExpenseFilters extends Record<string, string | undefined> {
  category?: string;
  projectId?: string;
  clientId?: string;
  from?: string;
  to?: string;
  search?: string;
}

/** GET /expenses — list expenses (optionally filtered). */
export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: queryKeys.expenses(filters),
    queryFn: () => api<Expense[]>("/expenses", { query: filters }),
  });
}

/** GET /expenses/:id */
export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: queryKeys.expense(expenseId),
    queryFn: () => api<Expense>(`/expenses/${expenseId}`),
    enabled: !!expenseId,
  });
}

/** Request body for POST /expenses and PATCH /expenses/:id (amount is PAISE). */
export interface ExpenseInput {
  category: ExpenseCategory;
  /** paise */
  amount: number;
  description?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  expenseDate?: string | null;
  receiptUrl?: string | null;
  gstDeductible?: 0 | 1 | boolean;
}

function invalidateExpenseScope(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["expenses"] });
  qc.invalidateQueries({ queryKey: ["clients"] });
  qc.invalidateQueries({ queryKey: ["finance"] });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) =>
      api<Expense>("/expenses", { method: "POST", body: input }),
    onSuccess: () => invalidateExpenseScope(qc),
  });
}

export function useUpdateExpense(expenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ExpenseInput>) =>
      api<Expense>(`/expenses/${expenseId}`, { method: "PATCH", body: input }),
    onSuccess: () => invalidateExpenseScope(qc),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) =>
      api<void>(`/expenses/${expenseId}`, { method: "DELETE" }),
    onSuccess: () => invalidateExpenseScope(qc),
  });
}
