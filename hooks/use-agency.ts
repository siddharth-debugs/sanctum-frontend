"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Agency } from "@/lib/api/types";

/** GET /agency — current agency profile. */
export function useAgency() {
  return useQuery({
    queryKey: queryKeys.agency,
    queryFn: () => api<Agency>("/agency"),
  });
}

export interface AgencyPatch {
  name?: string;
  logoUrl?: string | null;
  brandColor?: string | null;
}

/** PATCH /agency — owner/admin edit branding. */
export function useUpdateAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AgencyPatch) =>
      api<Agency>("/agency", { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agency });
      qc.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
