"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  Lead,
  LeadActivity,
  LeadFollowUp,
  LeadStage,
  LeadStats,
} from "@/lib/api/types";

const inval = (
  qc: ReturnType<typeof useQueryClient>,
  keys: readonly (readonly unknown[])[],
) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));

export type LeadBucket = "open" | "converted" | "bin" | "all";

export interface LeadFilters extends Record<string, string | undefined> {
  bucket?: LeadBucket;
  stage?: string;
  search?: string;
}

/** GET /leads — list leads, filtered by bucket / stage / search. */
export function useLeads(params?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads(params),
    queryFn: () => api<Lead[]>("/leads", { query: params }),
  });
}

/** GET /leads/stats — aggregate counts by stage + bucket. */
export function useLeadStats() {
  return useQuery({
    queryKey: queryKeys.leadStats,
    queryFn: () => api<LeadStats>("/leads/stats"),
  });
}

/** GET /leads/follow-ups — pending follow-ups across open leads (dueAt asc). */
export function useLeadFollowUps() {
  return useQuery({
    queryKey: queryKeys.leadFollowUps,
    queryFn: () => api<LeadFollowUp[]>("/leads/follow-ups"),
  });
}

/** GET /leads/:id — a lead plus its activity timeline (newest-first). */
export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: () => api<Lead & { activities: LeadActivity[] }>(`/leads/${id}`),
    enabled: !!id,
  });
}

/** Body for POST /leads and (partially) PATCH /leads/:id. */
export interface LeadInput {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  service?: string | null;
  budget?: string | null;
  message?: string | null;
  /** Estimated value in INTEGER PAISE. */
  estimatedValue?: number | null;
  ownerId?: string | null;
  stage?: LeadStage;
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadInput) =>
      api<Lead>("/leads", { method: "POST", body: input }),
    onSuccess: () => inval(qc, [["leads"]]),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<LeadInput> }) =>
      api<Lead>(`/leads/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => inval(qc, [["leads"]]),
  });
}

export interface ConvertLeadInput {
  name?: string;
  industry?: string;
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: ConvertLeadInput;
    }) =>
      api<{ clientId: string; leadId: string }>(`/leads/${id}/convert`, {
        method: "POST",
        body: input ?? {},
      }),
    onSuccess: () => inval(qc, [["leads"], ["clients"]]),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ deleted: true; id: string }>(`/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => inval(qc, [["leads"]]),
  });
}

/** Body for POST /leads/:id/activities. */
export interface LeadActivityInput {
  type?: "note" | "call" | "meeting" | "email" | "follow_up";
  body: string;
  dueAt?: string | null;
}

export function useAddLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, input }: { leadId: string; input: LeadActivityInput }) =>
      api<LeadActivity>(`/leads/${leadId}/activities`, {
        method: "POST",
        body: input,
      }),
    onSuccess: (_data, vars) =>
      inval(qc, [queryKeys.lead(vars.leadId), ["leads"]]),
  });
}

/** Body for PATCH /leads/:id/activities/:actId. */
export interface LeadActivityPatch {
  body?: string;
  dueAt?: string | null;
  done?: boolean;
}

export function useUpdateLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      actId,
      patch,
    }: {
      leadId: string;
      actId: string;
      patch: LeadActivityPatch;
    }) =>
      api<LeadActivity>(`/leads/${leadId}/activities/${actId}`, {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: (_data, vars) =>
      inval(qc, [queryKeys.lead(vars.leadId), ["leads"]]),
  });
}

export function useDeleteLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, actId }: { leadId: string; actId: string }) =>
      api<{ deleted: true; id: string }>(
        `/leads/${leadId}/activities/${actId}`,
        { method: "DELETE" },
      ),
    onSuccess: (_data, vars) =>
      inval(qc, [queryKeys.lead(vars.leadId), ["leads"]]),
  });
}
