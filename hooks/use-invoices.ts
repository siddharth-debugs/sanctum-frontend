"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Invoice, InvoicePayment } from "@/lib/api/types";

export interface InvoiceFilters extends Record<string, string | undefined> {
  status?: string;
  clientId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  search?: string;
}

/** GET /invoices — list invoices (optionally filtered). */
export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: queryKeys.invoices(filters),
    queryFn: () => api<Invoice[]>("/invoices", { query: filters }),
  });
}

/** GET /invoices/:id — full detail with items + payments. */
export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: queryKeys.invoice(invoiceId),
    queryFn: () => api<Invoice>(`/invoices/${invoiceId}`),
    enabled: !!invoiceId,
  });
}

/** A single line item on the create/update payload (rate is PAISE). */
export interface InvoiceItemInput {
  description: string;
  quantity?: number;
  unit?: string;
  /** paise */
  rate?: number;
  gstRate?: number;
}

/** Request body for POST /invoices and PATCH /invoices/:id. */
export interface InvoiceInput {
  clientId: string;
  projectId?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  isInterstate?: 0 | 1 | boolean;
  currency?: string;
  notes?: string | null;
  terms?: string | null;
  bankDetails?: string | null;
  status?: "draft" | "sent";
  items: InvoiceItemInput[];
}

/** Invalidate every list/rollup an invoice mutation can affect. */
function invalidateInvoiceScope(
  qc: ReturnType<typeof useQueryClient>,
  invoiceId?: string,
) {
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["clients"] });
  qc.invalidateQueries({ queryKey: ["finance"] });
  if (invoiceId) qc.invalidateQueries({ queryKey: queryKeys.invoice(invoiceId) });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceInput) =>
      api<Invoice>("/invoices", { method: "POST", body: input }),
    onSuccess: () => invalidateInvoiceScope(qc),
  });
}

export function useUpdateInvoice(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<InvoiceInput>) =>
      api<Invoice>(`/invoices/${invoiceId}`, { method: "PATCH", body: input }),
    onSuccess: () => invalidateInvoiceScope(qc, invoiceId),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      api<void>(`/invoices/${invoiceId}`, { method: "DELETE" }),
    onSuccess: () => invalidateInvoiceScope(qc),
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      api<Invoice>(`/invoices/${invoiceId}/send`, { method: "POST" }),
    onSuccess: (_data, invoiceId) => invalidateInvoiceScope(qc, invoiceId),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      api<Invoice>(`/invoices/${invoiceId}/cancel`, { method: "POST" }),
    onSuccess: (_data, invoiceId) => invalidateInvoiceScope(qc, invoiceId),
  });
}

/** Request body for POST /invoices/:id/payments (amount is PAISE). */
export interface PaymentInput {
  /** paise */
  amount: number;
  paidAt?: string | null;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export function useAddPayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) =>
      api<InvoicePayment>(`/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => invalidateInvoiceScope(qc, invoiceId),
  });
}

export function useDeletePayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api<void>(`/invoices/${invoiceId}/payments/${paymentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateInvoiceScope(qc, invoiceId),
  });
}
