"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  ClientContact,
  ClientNote,
  ClientNoteType,
  ClientTag,
  Deal,
  DealStage,
  FollowUp,
} from "@/lib/api/types";

const inval = (
  qc: ReturnType<typeof useQueryClient>,
  keys: readonly (readonly unknown[])[],
) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));

// ---- Contacts ----
export function useContacts(clientId: string) {
  return useQuery<ClientContact[]>({
    queryKey: queryKeys.contacts(clientId),
    queryFn: () => api<ClientContact[]>(`/crm/clients/${clientId}/contacts`),
    enabled: !!clientId,
  });
}
export interface ContactInput {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
  isBilling?: boolean;
  notes?: string | null;
}
export function useCreateContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactInput) =>
      api<ClientContact>(`/crm/clients/${clientId}/contacts`, { method: "POST", body: input }),
    onSuccess: () => inval(qc, [queryKeys.contacts(clientId)]),
  });
}
export function useUpdateContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ContactInput & { id: string }) =>
      api<ClientContact>(`/crm/contacts/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => inval(qc, [queryKeys.contacts(clientId)]),
  });
}
export function useDeleteContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/crm/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => inval(qc, [queryKeys.contacts(clientId)]),
  });
}

// ---- Notes / activity ----
export function useClientNotes(clientId: string) {
  return useQuery<ClientNote[]>({
    queryKey: queryKeys.clientNotes(clientId),
    queryFn: () => api<ClientNote[]>(`/crm/clients/${clientId}/notes`),
    enabled: !!clientId,
  });
}
export interface NoteInput {
  type?: ClientNoteType;
  body: string;
  pinned?: boolean;
  dueAt?: string | null;
}
export function useCreateNote(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) =>
      api<ClientNote>(`/crm/clients/${clientId}/notes`, { method: "POST", body: input }),
    onSuccess: () => inval(qc, [queryKeys.clientNotes(clientId)]),
  });
}
export function useUpdateNote(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<NoteInput> & { id: string; completed?: boolean }) =>
      api<ClientNote>(`/crm/notes/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => inval(qc, [queryKeys.clientNotes(clientId)]),
  });
}
export function useDeleteNote(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/crm/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => inval(qc, [queryKeys.clientNotes(clientId)]),
  });
}

// ---- Tags ----
export function useTags() {
  return useQuery<ClientTag[]>({
    queryKey: queryKeys.tags,
    queryFn: () => api<ClientTag[]>("/crm/tags"),
    staleTime: 5 * 60 * 1000,
  });
}
export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; colorToken?: string }) =>
      api<ClientTag>("/crm/tags", { method: "POST", body: input }),
    onSuccess: () => inval(qc, [queryKeys.tags]),
  });
}
export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/crm/tags/${id}`, { method: "DELETE" }),
    onSuccess: () => inval(qc, [queryKeys.tags]),
  });
}
export function useClientTags(clientId: string) {
  return useQuery<ClientTag[]>({
    queryKey: queryKeys.clientTags(clientId),
    queryFn: () => api<ClientTag[]>(`/crm/clients/${clientId}/tags`),
    enabled: !!clientId,
  });
}
export function useLinkTag(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) =>
      api<void>(`/crm/clients/${clientId}/tags/${tagId}`, { method: "POST" }),
    onSuccess: () => inval(qc, [queryKeys.clientTags(clientId), queryKeys.client(clientId)]),
  });
}
export function useUnlinkTag(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) =>
      api<void>(`/crm/clients/${clientId}/tags/${tagId}`, { method: "DELETE" }),
    onSuccess: () => inval(qc, [queryKeys.clientTags(clientId), queryKeys.client(clientId)]),
  });
}

// ---- Deals / pipeline ----
export function usePipeline() {
  return useQuery<Deal[]>({
    queryKey: queryKeys.pipeline,
    queryFn: () => api<Deal[]>("/crm/deals"),
  });
}
export function useClientDeals(clientId: string) {
  return useQuery<Deal[]>({
    queryKey: queryKeys.clientDeals(clientId),
    queryFn: () => api<Deal[]>(`/crm/clients/${clientId}/deals`),
    enabled: !!clientId,
  });
}
export interface DealInput {
  title: string;
  stage?: DealStage;
  valuePaise?: number;
  currency?: string;
  probability?: number;
  expectedCloseAt?: string | null;
  ownerId?: string | null;
  notes?: string | null;
  lostReason?: string | null;
}
export function useCreateDeal(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DealInput) =>
      api<Deal>(`/crm/clients/${clientId}/deals`, { method: "POST", body: input }),
    onSuccess: () => inval(qc, [queryKeys.clientDeals(clientId), queryKeys.pipeline]),
  });
}
export function useUpdateDeal(clientId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<DealInput> & { id: string }) =>
      api<Deal>(`/crm/deals/${id}`, { method: "PATCH", body: input }),
    onSuccess: () =>
      inval(qc, [queryKeys.pipeline, ...(clientId ? [queryKeys.clientDeals(clientId)] : [])]),
  });
}
export function useDeleteDeal(clientId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/crm/deals/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      inval(qc, [queryKeys.pipeline, ...(clientId ? [queryKeys.clientDeals(clientId)] : [])]),
  });
}

// ---- Follow-ups ----
export function useFollowUps() {
  return useQuery<FollowUp[]>({
    queryKey: queryKeys.followUps,
    queryFn: () => api<FollowUp[]>("/crm/follow-ups"),
  });
}
