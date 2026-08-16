"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Agreement, AgreementTemplate } from "@/lib/api/types";

export function useAgreements(filters?: { clientId?: string }) {
  return useQuery({
    queryKey: queryKeys.agreements(filters),
    queryFn: () => api<Agreement[]>("/agreements", { query: filters }),
  });
}

export function useAgreement(agreementId: string) {
  return useQuery({
    queryKey: queryKeys.agreement(agreementId),
    queryFn: () => api<Agreement>(`/agreements/${agreementId}`),
    enabled: !!agreementId,
  });
}

export function useAgreementTemplates() {
  return useQuery({
    queryKey: queryKeys.agreementTemplates,
    queryFn: () => api<AgreementTemplate[]>("/agreements/templates"),
  });
}

export function useCreateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      clientId: string;
      proposalId?: string;
      projectId?: string;
      templateId?: string;
      effectiveDate?: string;
      expirationDate?: string;
      retainerPaise?: number;
      totalValuePaise?: number;
      currency?: string;
      terms: Record<string, any>;
    }) => api<Agreement>("/agreements", { method: "POST", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agreements"] });
    },
  });
}

export function useUpdateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      clientId?: string;
      projectId?: string | null;
      templateId?: string | null;
      effectiveDate?: string;
      expirationDate?: string | null;
      retainerPaise?: number;
      totalValuePaise?: number;
      currency?: string;
      terms?: Record<string, any>;
    }) => api<Agreement>(`/agreements/${id}`, { method: "PUT", body }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.agreement(vars.id) });
      void qc.invalidateQueries({ queryKey: ["agreements"] });
    },
  });
}

export function useGenerateAiAgreement() {
  return useMutation({
    mutationFn: (body: {
      prompt: string;
      clientName?: string;
      agreementType?: string;
      retainerRupees?: number;
    }) =>
      api<{
        title: string;
        scope: string;
        clauses: string[];
        retainerRupees?: number;
        source: "gemini" | "fallback";
      }>("/agreements/ai/generate", { method: "POST", body }),
  });
}

export function useEnhanceAiAgreement() {
  return useMutation({
    mutationFn: (body: { text: string; context?: string; instruction?: string }) =>
      api<{ enhancedText: string; source: "gemini" | "fallback" }>(
        "/agreements/ai/enhance",
        { method: "POST", body },
      ),
  });
}

export function useSendAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      agreementId,
      recipientEmail,
      message,
    }: {
      agreementId: string;
      recipientEmail: string;
      message?: string;
    }) =>
      api<{ sent: boolean; signUrl: string }>(`/agreements/${agreementId}/send`, {
        method: "POST",
        body: { recipientEmail, message },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agreements"] });
    },
  });
}
