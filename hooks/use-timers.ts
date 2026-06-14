"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { RunningTimer, StopTimerResult } from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Format whole MINUTES as a compact "2h 15m" / "45m" / "3h" string. Returns
 * "0m" for nullish / zero input. (Same shape as team-options' fmtHours but kept
 * local to the timer surface so totals everywhere read identically.)
 */
export function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0 || Number.isNaN(minutes)) return "0m";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Zero-pad to two digits for clock segments. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format whole SECONDS as a live clock — "HH:MM:SS" (or "MM:SS" under 1h). */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(sec)}` : `${pad2(m)}:${pad2(sec)}`;
}

/* ------------------------------------------------------------------ */
/* Shared 1s ticker — one interval drives every live clock on screen   */
/* ------------------------------------------------------------------ */

const tickListeners = new Set<() => void>();
let tickHandle: ReturnType<typeof setInterval> | null = null;

function subscribeTick(cb: () => void) {
  tickListeners.add(cb);
  if (tickHandle === null) {
    tickHandle = setInterval(() => {
      tickListeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    tickListeners.delete(cb);
    if (tickListeners.size === 0 && tickHandle !== null) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  };
}

/**
 * Live elapsed seconds since `startedAt`, re-rendering once per second off a
 * single shared interval. Returns 0 when no start time is given (e.g. no active
 * timer), and unsubscribes from the shared ticker when unmounted / cleared.
 */
export function useElapsed(startedAt: string | null | undefined): number {
  const startMs = React.useMemo(() => {
    if (!startedAt) return null;
    const t = new Date(startedAt).getTime();
    return Number.isNaN(t) ? null : t;
  }, [startedAt]);

  const compute = React.useCallback(
    () => (startMs == null ? 0 : Math.max(0, Math.floor((Date.now() - startMs) / 1000))),
    [startMs],
  );

  const [seconds, setSeconds] = React.useState(compute);

  React.useEffect(() => {
    setSeconds(compute());
    if (startMs == null) return;
    return subscribeTick(() => setSeconds(compute()));
  }, [startMs, compute]);

  return seconds;
}

/* ------------------------------------------------------------------ */
/* Queries + mutations                                                 */
/* ------------------------------------------------------------------ */

/**
 * GET /timers/active — the current user's running timer (or null). Polls every
 * 30s so the global pill stays accurate even if another tab/device starts or
 * stops a timer; the visible clock still ticks every second client-side.
 */
export function useActiveTimer() {
  return useQuery<RunningTimer | null>({
    queryKey: queryKeys.activeTimer,
    queryFn: () => api<RunningTimer | null>("/timers/active"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export interface StartTimerInput {
  projectId: string;
  taskId?: string | null;
  note?: string | null;
}

/** Refetch everything a start/stop can move: the pill + the project's insights. */
function invalidateTimerSurfaces(
  qc: ReturnType<typeof useQueryClient>,
  projectId?: string,
) {
  qc.invalidateQueries({ queryKey: queryKeys.activeTimer });
  qc.invalidateQueries({ queryKey: ["timers"] });
  if (projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.projectTimers(projectId) });
    qc.invalidateQueries({ queryKey: queryKeys.projectActivity(projectId) });
    qc.invalidateQueries({ queryKey: queryKeys.projectOverview(projectId) });
    qc.invalidateQueries({ queryKey: queryKeys.projectTimeSummary(projectId) });
    qc.invalidateQueries({ queryKey: queryKeys.projectTimeLogs(projectId) });
  } else {
    // No project context (e.g. stopping from the global pill) — refresh all.
    qc.invalidateQueries({ queryKey: ["projects"] });
  }
}

/** POST /timers/start — begins a timer (auto-stops any other running one). */
export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StartTimerInput) =>
      api<RunningTimer>("/timers/start", { method: "POST", body: input }),
    onSuccess: (timer, vars) =>
      invalidateTimerSurfaces(qc, vars.projectId ?? timer.projectId),
  });
}

/** POST /timers/stop — stops the user's running timer and logs the minutes. */
export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<StopTimerResult>("/timers/stop", { method: "POST" }),
    onSuccess: (res) => invalidateTimerSurfaces(qc, res.timeLog.projectId ?? undefined),
  });
}
