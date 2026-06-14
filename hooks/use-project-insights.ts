"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  ProjectActivity,
  ProjectActiveTimer,
  ProjectOverview,
  ProjectTimeLog,
  ProjectTimeSummary,
} from "@/lib/api/types";

/** GET /projects/:id/overview — the boss-dashboard rollup (stat row + Overview). */
export function useProjectOverview(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectOverview(projectId),
    queryFn: () => api<ProjectOverview>(`/projects/${projectId}/overview`),
    enabled: !!projectId,
  });
}

/**
 * GET /projects/:id/activity — reverse-chron audit feed. Polls modestly so new
 * task moves / timer events appear without a manual refresh.
 */
export function useProjectActivity(projectId: string, limit = 100) {
  return useQuery({
    queryKey: [...queryKeys.projectActivity(projectId), limit] as const,
    queryFn: () =>
      api<ProjectActivity[]>(`/projects/${projectId}/activity`, {
        query: { limit },
      }),
    enabled: !!projectId,
    refetchInterval: 60_000,
  });
}

/** GET /projects/:id/time-summary — totals + by-member / by-task / active. */
export function useProjectTimeSummary(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectTimeSummary(projectId),
    queryFn: () =>
      api<ProjectTimeSummary>(`/projects/${projectId}/time-summary`),
    enabled: !!projectId,
  });
}

/** GET /projects/:id/time-logs — recent logged entries. */
export function useProjectTimeLogs(projectId: string, limit = 50) {
  return useQuery({
    queryKey: [...queryKeys.projectTimeLogs(projectId), limit] as const,
    queryFn: () =>
      api<ProjectTimeLog[]>(`/projects/${projectId}/time-logs`, {
        query: { limit },
      }),
    enabled: !!projectId,
  });
}

/**
 * GET /projects/:id/timers — who is actively working on this project right now.
 * Polls every 30s so "Working now" reflects teammates starting/stopping; each
 * row's clock still ticks live via useElapsed.
 */
export function useProjectTimers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectTimers(projectId),
    queryFn: () =>
      api<ProjectActiveTimer[]>(`/projects/${projectId}/timers`),
    enabled: !!projectId,
    refetchInterval: 30_000,
  });
}
