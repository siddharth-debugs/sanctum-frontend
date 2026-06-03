"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { TeamMember } from "@/lib/api/types";

/** GET /team — users in the agency. */
export function useTeam() {
  return useQuery({
    queryKey: queryKeys.team(),
    queryFn: () => api<TeamMember[]>("/team"),
  });
}
