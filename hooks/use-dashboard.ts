"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AgencyUsage,
  AnalyticsSummary,
  PostStatus,
} from "@/lib/api/types";

export interface DashboardModel {
  totals: { clients: number; posts: number };
  postsByStatus: Record<PostStatus, number>;
  ai: { used: number; limit: number | null };
  /** True when usage data was unavailable (e.g. caller is a member, 403). */
  usageUnavailable: boolean;
}

const EMPTY_STATUS: Record<PostStatus, number> = {
  draft: 0,
  pending_approval: 0,
  approved: 0,
  changes_requested: 0,
  scheduled: 0,
  posted: 0,
};

/**
 * Composes the dashboard from the real backend endpoints:
 *   GET /analytics/summary  -> { clients, posts, postsByStatus }
 *   GET /agency/usage       -> AI/storage/clients/team usage vs plan
 * Both are owner/admin only; usage failures (403) degrade gracefully.
 */
export function useDashboard() {
  return useQuery<DashboardModel>({
    queryKey: queryKeys.dashboard(),
    queryFn: async () => {
      const summary = await api<AnalyticsSummary>("/analytics/summary");

      let usage: AgencyUsage | null = null;
      try {
        usage = await api<AgencyUsage>("/agency/usage");
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 403)) throw err;
      }

      return {
        totals: { clients: summary.clients, posts: summary.posts },
        postsByStatus: { ...EMPTY_STATUS, ...summary.postsByStatus },
        ai: usage?.ai ?? { used: 0, limit: null },
        usageUnavailable: usage === null,
      };
    },
  });
}
