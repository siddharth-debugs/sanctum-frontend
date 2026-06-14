"use client";

import * as React from "react";
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
 * GLOBAL running-timer widget, mounted once in the app shell header. When the
 * current user has a running timer it shows a compact pill:
 *
 *   ⏱ 00:12:34 · <taskTitle or projectName>   [■ Stop]
 *
 * with a LIVE ticking clock (tabular-nums) and a pulsing dot. Hidden entirely
 * when there is no active timer. Anyone can stop their timer from any page.
 */
export function ActiveTimerBar() {
  const { data: timer } = useActiveTimer();
  const stop = useStopTimer();

  const elapsed = useElapsed(timer?.startedAt);

  if (!timer) return null;

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

  return (
    <div
      data-print-hide
      className="flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] py-1 pr-1 pl-2.5 shadow-sm animate-in fade-in-0 slide-in-from-top-1 duration-200"
      role="status"
      aria-label={`Timer running on ${label}`}
    >
      {/* Pulsing live dot + icon */}
      <span className="relative flex size-2 shrink-0 items-center justify-center">
        <span className="absolute inline-flex size-2 animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>

      <Timer className="size-4 shrink-0 text-primary" aria-hidden />

      <span className="font-mono text-sm font-semibold tabular-nums leading-none text-foreground">
        {fmtClock(elapsed)}
      </span>

      <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground sm:inline">
        <span className="px-1 opacity-50">·</span>
        {label}
      </span>

      <Button
        size="sm"
        variant="destructive"
        onClick={onStop}
        disabled={stop.isPending}
        className="h-7 gap-1.5 rounded-full px-2.5"
        aria-label="Stop timer"
      >
        <Square className="size-3 fill-current" />
        {stop.isPending ? "Stopping…" : "Stop"}
      </Button>
    </div>
  );
}
