"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import type { PortalToken, PortalTokenCreated } from "@/lib/api/types";

const tokensKey = (clientId: string) =>
  ["clients", clientId, "portal-tokens"] as const;

/** GET /clients/:clientId/portal-tokens */
export function usePortalTokens(clientId: string) {
  return useQuery({
    queryKey: tokensKey(clientId),
    queryFn: () =>
      api<PortalToken[]>(`/clients/${clientId}/portal-tokens`),
    enabled: !!clientId,
  });
}

/** POST /clients/:clientId/portal-tokens (raw token returned once). */
export function useCreatePortalToken(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input?: { label?: string; expiresInDays?: number }) =>
      api<PortalTokenCreated>(`/clients/${clientId}/portal-tokens`, {
        method: "POST",
        body: input ?? {},
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tokensKey(clientId) }),
  });
}

/** POST /clients/:clientId/portal-tokens/:tokenId/revoke */
export function useRevokePortalToken(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) =>
      api<{ revoked: boolean }>(
        `/clients/${clientId}/portal-tokens/${tokenId}/revoke`,
        { method: "POST" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: tokensKey(clientId) }),
  });
}

/**
 * Creates a fresh portal share link and opens it in a new tab. The raw token is
 * only ever returned once (at creation), so we open it immediately.
 */
export function useOpenClientPortal(clientId: string) {
  return useMutation({
    mutationFn: () =>
      api<PortalTokenCreated>(`/clients/${clientId}/portal-tokens`, {
        method: "POST",
        body: { label: "Quick share" },
      }),
    onSuccess: (res) => {
      const url = `${window.location.origin}/portal/${res.token}`;
      window.open(url, "_blank", "noopener");
      toast.success("Portal link opened in a new tab");
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : "Could not create portal link",
      );
    },
  });
}
