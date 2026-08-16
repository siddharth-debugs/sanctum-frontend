"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import type {
  ProjectHealth,
  ProjectStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Types (these endpoints have no entries in lib/api/types.ts yet, so  */
/* the response shapes are declared here alongside their hooks).       */
/* ------------------------------------------------------------------ */

/** GET /me/overview — headline numbers for the "My day" (employee) dashboard. */
export interface MyOverview {
  openTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  /** Minutes logged today. */
  todayMinutes: number;
  /** Minutes logged this week (Mon→now). */
  weekMinutes: number;
}

/** One assigned task across every project (GET /me/tasks). */
export interface MyTask {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  /** ISO date, or null when unset. Overdue = dueDate < start of today. */
  dueDate: string | null;
  projectId: string;
  projectName: string;
  clientName: string | null;
}

/** GET /analytics/team-overview — the Manager dashboard rollup. */
export interface TeamOverview {
  projectsByStatus: Partial<Record<ProjectStatus, number>>;
  projectsByHealth: Partial<Record<ProjectHealth, number>>;
  tasksByStatus: Partial<Record<ProjectTaskStatus, number>>;
  memberCount: number;
  activeProjects: number;
}

/* ------------------------------------------------------------------ */
/* Query keys (local — the shared factory has no "my day" entries).    */
/* ------------------------------------------------------------------ */

const myDayKeys = {
  overview: ["me", "overview"] as const,
  tasks: (filters?: Record<string, unknown>) =>
    ["me", "tasks", filters ?? {}] as const,
  teamOverview: ["analytics", "team-overview"] as const,
};

const EMPTY_OVERVIEW: MyOverview = {
  openTasks: 0,
  overdueTasks: 0,
  dueTodayTasks: 0,
  todayMinutes: 0,
  weekMinutes: 0,
};

const EMPTY_TEAM_OVERVIEW: TeamOverview = {
  projectsByStatus: {},
  projectsByHealth: {},
  tasksByStatus: {},
  memberCount: 0,
  activeProjects: 0,
};

/** Swallow a 403 (module not granted) so a dashboard degrades to an empty
 * state instead of erroring; re-throw everything else. */
function fallbackOn403<T>(fallback: T) {
  return (err: unknown): T => {
    if (err instanceof ApiError && err.status === 403) return fallback;
    throw err;
  };
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** GET /me/overview — my open/overdue/due-today counts + minutes logged. */
export function useMyOverview() {
  return useQuery<MyOverview>({
    queryKey: myDayKeys.overview,
    queryFn: () =>
      api<MyOverview>("/me/overview").catch(fallbackOn403(EMPTY_OVERVIEW)),
  });
}

export interface MyTasksFilters extends Record<string, string | undefined> {
  status?: ProjectTaskStatus;
  includeDone?: "true" | "false";
}

/** GET /me/tasks — my assigned tasks across every project (overdue first). */
export function useMyTasks(filters?: MyTasksFilters) {
  return useQuery<MyTask[]>({
    queryKey: myDayKeys.tasks(filters),
    queryFn: () =>
      api<MyTask[]>("/me/tasks", { query: filters }).catch(fallbackOn403([])),
  });
}

/** GET /analytics/team-overview — projects/tasks rollup for the Manager view. */
export function useTeamOverview() {
  return useQuery<TeamOverview>({
    queryKey: myDayKeys.teamOverview,
    queryFn: () =>
      api<TeamOverview>("/analytics/team-overview").catch(
        fallbackOn403(EMPTY_TEAM_OVERVIEW),
      ),
  });
}
