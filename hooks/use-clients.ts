"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Client } from "@/lib/api/types";

/** GET /clients — list clients in the agency (owner/admin: all; member: assigned). */
export function useClients(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.clients(filters),
    queryFn: () => api<Client[]>("/clients", { query: filters }),
    // Client-side filtering happens in the table; backend ignores unknown query.
    select: filters?.status
      ? (rows) => rows.filter((c) => c.status === filters.status)
      : undefined,
  });
}

/** GET /clients/:id */
export function useClient(clientId: string) {
  return useQuery({
    queryKey: queryKeys.client(clientId),
    queryFn: () => api<Client>(`/clients/${clientId}`),
    enabled: !!clientId,
  });
}

/** Request body for POST /clients and PATCH /clients/:id. */
export interface ClientInput {
  name: string;
  contactEmail?: string;
  brandColor?: string;
  logoUrl?: string;
  handles?: Record<string, string>;
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientInput) =>
      api<Client>("/clients", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ClientInput> & { status?: Client["status"] }) =>
      api<Client>(`/clients/${clientId}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
