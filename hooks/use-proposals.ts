"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Proposal, ProposalTemplate } from "@/lib/api/types";

export function useProposals(filters?: { clientId?: string; leadId?: string }) {
  return useQuery({
    queryKey: queryKeys.proposals(filters),
    queryFn: () => api<Proposal[]>("/proposals", { query: filters }),
  });
}

export function useProposal(proposalId: string) {
  return useQuery({
    queryKey: queryKeys.proposal(proposalId),
    queryFn: () => api<Proposal>(`/proposals/${proposalId}`),
    enabled: !!proposalId,
  });
}

export function useProposalTemplates() {
  return useQuery({
    queryKey: queryKeys.proposalTemplates,
    queryFn: () => api<ProposalTemplate[]>("/proposals/templates"),
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      clientId?: string;
      leadId?: string;
      templateId?: string;
      currency?: string;
      subtotalPaise?: number;
      taxPaise?: number;
      totalPaise?: number;
      validUntil?: string;
      content: Record<string, any>;
    }) => api<Proposal>("/proposals", { method: "POST", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useUpdateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      clientId?: string | null;
      leadId?: string | null;
      templateId?: string | null;
      currency?: string;
      subtotalPaise?: number;
      taxPaise?: number;
      totalPaise?: number;
      validUntil?: string | null;
      content?: Record<string, any>;
    }) => api<Proposal>(`/proposals/${id}`, { method: "PUT", body }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.proposal(vars.id) });
      void qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useGenerateAiProposal() {
  return useMutation({
    mutationFn: (body: {
      prompt: string;
      clientName?: string;
      budgetRupees?: number;
      deliverablesCount?: number;
    }) =>
      api<{
        title: string;
        overview: string;
        deliverables: Array<{
          title: string;
          description: string;
          priceRupees?: number;
        }>;
        terms: string[];
        estimatedDurationWeeks?: number;
        source: "gemini" | "fallback";
      }>("/proposals/ai/generate", { method: "POST", body }),
  });
}

export function useEnhanceAiProposal() {
  return useMutation({
    mutationFn: (body: { text: string; context?: string; instruction?: string }) =>
      api<{ enhancedText: string; source: "gemini" | "fallback" }>(
        "/proposals/ai/enhance",
        { method: "POST", body },
      ),
  });
}

export function useSendProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      proposalId,
      recipientEmail,
      message,
    }: {
      proposalId: string;
      recipientEmail: string;
      message?: string;
    }) =>
      api<{ sent: boolean; publicUrl: string }>(`/proposals/${proposalId}/send`, {
        method: "POST",
        body: { recipientEmail, message },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useConvertProposalToAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) =>
      api<{ agreementId: string; agreementNumber: string }>(
        `/proposals/${proposalId}/convert-to-agreement`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["proposals"] });
      void qc.invalidateQueries({ queryKey: ["agreements"] });
    },
  });
}
