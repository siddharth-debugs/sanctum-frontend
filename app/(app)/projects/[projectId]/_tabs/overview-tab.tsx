"use client";

import * as React from "react";
import {
  Activity as ActivityIcon,
  Flag,
  LayoutGrid,
  Timer,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TASK_STATUSES } from "@/lib/constants/project-options";
import {
  describeActivity,
  ACTIVITY_TONE_CLASS,
} from "@/lib/constants/activity-options";
import { fmtDuration, useElapsed, fmtClock } from "@/hooks/use-timers";
import {
  useProjectOverview,
  useProjectTimers,
  useProjectTimeSummary,
} from "@/hooks/use-project-insights";
import { initials, cn } from "@/lib/utils";
import type { ProjectActiveTimer, ProjectTaskStatus } from "@/lib/api/types";
import { MiniEmpty } from "./shared";

/** A single "Working now" row with a live ticking clock. */
function WorkingRow({ timer }: { timer: ProjectActiveTimer }) {
  const elapsed = useElapsed(timer.startedAt);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="relative flex size-2 shrink-0 items-center justify-center">
        <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      <Avatar size="sm">
        <AvatarFallback className="text-[10px]">
          {initials(timer.userName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {timer.userName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {timer.taskTitle ?? "General work"}
        </p>
      </div>
      <span className="font-mono text-sm font-semibold tabular-nums text-success">
        {fmtClock(elapsed)}
      </span>
    </div>
  );
}

export function OverviewTab({ projectId }: { projectId: string }) {
  const { data: overview, isLoading } = useProjectOverview(projectId);
  const { data: timers } = useProjectTimers(projectId);
  const { data: summary } = useProjectTimeSummary(projectId);

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  const tasksByStatus = overview.tasksByStatus;
  const maxStatus = Math.max(
    1,
    ...TASK_STATUSES.map((s) => tasksByStatus[s.value as ProjectTaskStatus] ?? 0),
  );
  const milestonePct =
    overview.milestoneTotal > 0
      ? Math.round((overview.milestoneDone / overview.milestoneTotal) * 100)
      : 0;

  const activeTimers = timers ?? [];
  const byMember = (summary?.byMember ?? []).slice(0, 5);
  const maxMember = Math.max(1, ...byMember.map((m) => m.minutes));
  const recent = overview.recentActivity.slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Tasks by status distribution */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <LayoutGrid className="size-4 text-primary" />
          <CardTitle className="text-base">Tasks by status</CardTitle>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {overview.taskDone}/{overview.taskTotal} done
          </span>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {overview.taskTotal === 0 ? (
            <MiniEmpty>No tasks yet — add some in the Tasks tab.</MiniEmpty>
          ) : (
            TASK_STATUSES.map((s) => {
              const count = tasksByStatus[s.value as ProjectTaskStatus] ?? 0;
              return (
                <div key={s.value} className="flex items-center gap-3">
                  <span className="flex w-24 shrink-0 items-center gap-2 text-xs font-medium">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.dot }}
                    />
                    {s.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(count / maxStatus) * 100}%`,
                        backgroundColor: s.dot,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Milestone progress */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Flag className="size-4 text-accent" />
          <CardTitle className="text-base">Milestone progress</CardTitle>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {overview.milestoneDone}/{overview.milestoneTotal}
          </span>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {overview.milestoneTotal === 0 ? (
            <MiniEmpty>No milestones yet.</MiniEmpty>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <span className="font-display text-4xl font-semibold tabular-nums leading-none">
                  {milestonePct}%
                </span>
                <span className="text-xs text-muted-foreground">complete</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${milestonePct}%` }}
                />
              </div>
            </>
          )}
          <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
            <div>
              <p className="font-display text-lg font-semibold tabular-nums">
                {overview.memberCount}
              </p>
              <p className="text-[11px] text-muted-foreground">Team</p>
            </div>
            <div>
              <p className="font-display text-lg font-semibold tabular-nums">
                {fmtDuration(overview.totalTimeMinutes)}
              </p>
              <p className="text-[11px] text-muted-foreground">Logged</p>
            </div>
            <div>
              <p
                className={cn(
                  "font-display text-lg font-semibold tabular-nums",
                  overview.activeTimerCount > 0 && "text-success",
                )}
              >
                {overview.activeTimerCount}
              </p>
              <p className="text-[11px] text-muted-foreground">Active now</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Who's working now */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Timer className="size-4 text-success" />
          <CardTitle className="text-base">Who&apos;s working now</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {activeTimers.length === 0 ? (
            <MiniEmpty>No one has a timer running right now.</MiniEmpty>
          ) : (
            <div className="divide-y">
              {activeTimers.map((t) => (
                <WorkingRow key={`${t.userId}-${t.startedAt}`} timer={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time by member */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <TrendingUp className="size-4 text-primary" />
          <CardTitle className="text-base">Time by member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {byMember.length === 0 ? (
            <MiniEmpty>No time logged on this project yet.</MiniEmpty>
          ) : (
            byMember.map((m) => (
              <div key={m.userId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium">{m.userName}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {fmtDuration(m.minutes)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${(m.minutes / maxMember) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <ActivityIcon className="size-4 text-primary" />
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recent.length === 0 ? (
            <MiniEmpty>Nothing has happened yet.</MiniEmpty>
          ) : (
            <ul className="space-y-3">
              {recent.map((a) => {
                const view = describeActivity(a);
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                        ACTIVITY_TONE_CLASS[view.tone],
                      )}
                    >
                      {view.icon}
                    </span>
                    <div className="min-w-0 flex-1 text-sm leading-snug">
                      <span className="font-medium">
                        {a.actorName ?? "Someone"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {view.summary}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
