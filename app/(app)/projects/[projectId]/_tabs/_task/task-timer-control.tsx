"use client";

import * as React from "react";
import { toast } from "sonner";
import { Play, Square, Timer as TimerIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useElapsed,
  fmtClock,
  fmtDuration,
} from "@/hooks/use-timers";
import { ApiError } from "@/lib/api/client";

export interface TaskTimerControlProps {
  projectId: string;
  taskId: string;
  taskTitle: string;
  /** Total minutes already logged on this task (for the "tracked" summary). */
  totalMinutes: number;
}

/**
 * The per-task timer control (build §1). A single primary action that flips
 * between Start and Stop depending on whether the current user's running timer
 * is bound to THIS task:
 *
 *   • No timer / timer on another task → "Start" (green). Starting binds the
 *     timer to this task+project; the backend auto-stops any other running one,
 *     so we warn when switching away from a different task.
 *   • Timer running on this task → a live "HH:MM:SS" clock + "Stop" (red) that
 *     writes the time log.
 *
 * Shows "Total tracked" beside the control. Mutations are disabled while in
 * flight; toasts confirm/announce errors. Live clock uses tabular-nums and the
 * shared 1s ticker; the pulsing dot respects prefers-reduced-motion via the
 * `motion-safe` utility on `animate-ping`.
 */
export function TaskTimerControl({
  projectId,
  taskId,
  taskTitle,
  totalMinutes,
}: TaskTimerControlProps) {
  const { data: active } = useActiveTimer();
  const start = useStartTimer();
  const stop = useStopTimer();

  const runningHere = active?.taskId === taskId;
  const runningElsewhere = !!active && !runningHere;

  // Tick only when the timer is bound to this task.
  const elapsed = useElapsed(runningHere ? active?.startedAt : null);

  const busy = start.isPending || stop.isPending;

  const onStart = () => {
    start.mutate(
      { projectId, taskId },
      {
        onSuccess: () =>
          toast.success(
            runningElsewhere
              ? `Switched timer to "${taskTitle}"`
              : `Timer started on "${taskTitle}"`,
          ),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't start the timer",
          ),
      },
    );
  };

  const onStop = () => {
    stop.mutate(undefined, {
      onSuccess: (res) =>
        toast.success(`Timer stopped · ${fmtDuration(res.minutes)} logged`),
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't stop the timer",
        ),
    });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors",
        runningHere
          ? "border-[color-mix(in_srgb,var(--success)_45%,var(--border))] bg-[color-mix(in_srgb,var(--success)_8%,var(--card))]"
          : "bg-card",
      )}
    >
      {runningHere ? (
        <>
          {/* Live running state */}
          <span className="relative flex size-2.5 shrink-0 items-center justify-center">
            <span className="absolute inline-flex size-2.5 rounded-full bg-success opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
          <span
            className="font-mono text-lg font-semibold leading-none tabular-nums text-success"
            aria-live="polite"
            aria-label={`Elapsed ${fmtClock(elapsed)}`}
          >
            {fmtClock(elapsed)}
          </span>
          <Button
            variant="destructive"
            onClick={onStop}
            disabled={busy}
            aria-label={`Stop timer on ${taskTitle}`}
            className="ml-auto h-11 min-w-[5.5rem] gap-1.5"
          >
            <Square className="size-3.5 fill-current" aria-hidden />
            {stop.isPending ? "Stopping…" : "Stop"}
          </Button>
        </>
      ) : (
        <>
          <TimerIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">Time tracking</p>
            <p className="text-xs text-muted-foreground">
              {totalMinutes > 0 ? (
                <>
                  Total tracked:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {fmtDuration(totalMinutes)}
                  </span>
                </>
              ) : (
                "No time logged yet"
              )}
            </p>
          </div>
          <Button
            onClick={onStart}
            disabled={busy}
            aria-label={`Start timer on ${taskTitle}`}
            className="ml-auto h-11 min-w-[5.5rem] gap-1.5 bg-success text-white hover:bg-success/90"
          >
            <Play className="size-4 fill-current" aria-hidden />
            {start.isPending
              ? "Starting…"
              : runningElsewhere
                ? "Switch"
                : "Start"}
          </Button>
        </>
      )}
    </div>
  );
}
