"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Invoice } from "@/lib/api/types";

export function useInvoices(filters?: { clientId?: string; projectId?: string }) {
  return useQuery({
    queryKey: queryKeys.invoices(filters),
    queryFn: () => api<Invoice[]>("/invoices", { query: filters }),
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: queryKeys.invoice(invoiceId),
    queryFn: () => api<Invoice>(`/invoices/${invoiceId}`),
    enabled: !!invoiceId,
  });
}

export interface CreateInvoiceInput {
  clientId: string;
  projectId?: string;
  issueDate?: string;
  dueDate?: string;
  isInterstate?: boolean;
  currency?: string;
  notes?: string;
  terms?: string;
  bankDetails?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    rate: number; // paise
    gstRate: number;
  }>;
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvoiceInput) =>
      api<Invoice>("/invoices", { method: "POST", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      amount,
      paidAt,
      method,
      reference,
      notes,
    }: {
      invoiceId: string;
      amount: number;
      paidAt?: string;
      method: string;
      reference?: string;
      notes?: string;
    }) =>
      api<{ paymentId: string; status: string; totalPaid: number }>(
        `/invoices/${invoiceId}/payments`,
        {
          method: "POST",
          body: { amount, paidAt, method, reference, notes },
        },
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.invoice(vars.invoiceId) });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      status,
    }: {
      invoiceId: string;
      status: "draft" | "sent" | "cancelled" | "paid";
    }) =>
      api<{ status: string }>(`/invoices/${invoiceId}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.invoice(vars.invoiceId) });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
