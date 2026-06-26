"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Client, ClientSource, RelationshipHealth } from "@/lib/api/types";

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

/**
 * Request body for POST /clients and PATCH /clients/:id. Optional fields accept
 * `null` so the edit form can CLEAR them (the backend writes null when present).
 */
export interface ClientInput {
  name: string;
  contactEmail?: string | null;
  brandColor?: string | null;
  logoUrl?: string | null;
  handles?: Record<string, string>;
  // CRM: company profile
  industry?: string | null;
  website?: string | null;
  phoneCc?: string | null;
  phone?: string | null;
  clientSource?: ClientSource | null;
  // CRM: billing
  gstNumber?: string | null;
  paymentTermsDays?: number | null;
  billingAddress?: string | null;
  billingState?: string | null;
  billingCity?: string | null;
  billingPincode?: string | null;
  // CRM: relationship
  relationshipHealth?: RelationshipHealth;
  nextFollowUpAt?: string | null;
  internalNotes?: string | null;
  /** Account manager / relationship owner (null clears). */
  ownerId?: string | null;
  /** 'Active client' toggle — maps to status on the backend. */
  isActive?: boolean;
  /** Post statuses the client portal exposes. */
  portalVisibleStatuses?: string[];
  status?: Client["status"];
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
