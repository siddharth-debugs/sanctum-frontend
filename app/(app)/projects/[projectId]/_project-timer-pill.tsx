"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Square, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useActiveTimer,
  useStopTimer,
  useElapsed,
  fmtClock,
  fmtDuration,
} from "@/hooks/use-timers";
import { ApiError } from "@/lib/api/client";

/**
 * Project-scoped running-timer pill (build §2). A floating, sticky bottom pill
 * rendered by the project page so it stays visible while navigating the
 * project's tabs (Overview / Tasks / Milestones / …). It mirrors the current
 * user's active timer with a LIVE clock, the task/project label, and a Stop
 * button. Clicking the label deep-links to the timed task (opens its detail
 * sheet via `?task=`).
 *
 * It only renders when the active timer belongs to THIS project, so it never
 * double-shows alongside another project's context; the global header pill
 * covers the everywhere-else case.
 */
export function ProjectTimerPill({ projectId }: { projectId: string }) {
  const { data: timer } = useActiveTimer();
  const stop = useStopTimer();
  const router = useRouter();

  const inThisProject = timer?.projectId === projectId;
  const elapsed = useElapsed(inThisProject ? timer?.startedAt : null);

  if (!timer || !inThisProject) return null;

  const label = timer.taskTitle || timer.projectName;

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

  const openTask = () => {
    if (timer.taskId) {
      router.push(`/projects/${projectId}?task=${timer.taskId}`);
    }
  };

  return (
    <div
      data-print-hide
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
    >
      <div
        role="status"
        aria-label={`Timer running on ${label}`}
        className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-full border border-[color-mix(in_srgb,var(--success)_40%,var(--border))] bg-[color-mix(in_srgb,var(--success)_12%,var(--card))] py-1.5 pr-1.5 pl-3 shadow-lg backdrop-blur"
      >
        {/* Pulsing live dot */}
        <span className="relative flex size-2.5 shrink-0 items-center justify-center">
          <span className="absolute inline-flex size-2.5 rounded-full bg-success opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>

        <Timer className="size-4 shrink-0 text-success" aria-hidden />

        <span className="font-mono text-sm font-semibold leading-none tabular-nums text-foreground">
          {fmtClock(elapsed)}
        </span>

        {timer.taskId ? (
          <button
            type="button"
            onClick={openTask}
            className="max-w-[12rem] truncate text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[16rem]"
            aria-label={`Open timed task: ${label}`}
          >
            <span aria-hidden className="px-1 opacity-50">
              ·
            </span>
            {label}
          </button>
        ) : (
          <span className="max-w-[12rem] truncate text-sm text-muted-foreground sm:max-w-[16rem]">
            <span aria-hidden className="px-1 opacity-50">
              ·
            </span>
            {label}
          </span>
        )}

        <Button
          size="sm"
          variant="destructive"
          onClick={onStop}
          disabled={stop.isPending}
          className="h-8 min-h-0 gap-1.5 rounded-full px-3"
          aria-label="Stop timer"
        >
          <Square className="size-3 fill-current" aria-hidden />
          {stop.isPending ? "Stopping…" : "Stop"}
        </Button>
      </div>
    </div>
  );
}
