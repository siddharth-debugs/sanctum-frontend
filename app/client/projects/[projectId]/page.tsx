"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  Flag,
  ListChecks,
  Users2,
  SearchX,
} from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  useClientProject,
  useClientProjectTeam,
  isNotFound,
} from "@/hooks/use-client-portal";
import {
  StatusPill,
  HealthPill,
  ProgressRing,
  EmptyState,
  ErrorState,
  humanize,
} from "../../_components/portal-bits";

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
      <Link href="/client/projects">
        <ArrowLeft className="size-4" />
        All projects
      </Link>
    </Button>
  );
}

/** Team panel — assigned members (name + role only; NO emails). */
function TeamPanel({ projectId }: { projectId: string }) {
  const team = useClientProjectTeam(projectId);
  const members = team.data ?? [];

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users2 className="size-4 text-primary" />
        Team
      </div>
      <div className="mt-4">
        {team.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : team.isError ? (
          <p className="text-sm text-muted-foreground">
            Couldn't load the team right now.
          </p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members assigned yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-xs font-bold text-accent">
                  {initials(m.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {humanize(m.role)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassCard>
  );
}

export default function ClientProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const project = useClientProject(projectId);

  if (project.isLoading) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (project.isError) {
    if (isNotFound(project.error)) {
      return (
        <div className="space-y-6">
          <BackLink />
          <EmptyState
            icon={SearchX}
            title="Project not found"
            hint="This project doesn't exist or isn't part of your workspace."
          />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState onRetry={() => project.refetch()} />
      </div>
    );
  }

  const p = project.data;
  if (!p) return null;

  const pct =
    p.progress ??
    (p.tasksTotal > 0 ? Math.round((p.tasksDone / p.tasksTotal) * 100) : 0);
  const statusEntries = Object.entries(p.tasksByStatus ?? {});
  const milestones = p.milestones ?? [];

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {p.name}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={p.status} />
                <HealthPill health={p.health} />
              </div>
            </div>
            {p.description && (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {p.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              {p.startDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  Started {formatDate(p.startDate)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                {p.deadline ? `Due ${formatDate(p.deadline)}` : "No deadline set"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="size-3.5" />
                {p.tasksDone}/{p.tasksTotal} tasks done
              </span>
            </div>
          </div>
          <div className="flex shrink-0 justify-center sm:justify-end">
            <ProgressRing pct={pct} size={96} stroke={7} />
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Tasks by status */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="size-4 text-primary" />
              Tasks by status
            </div>
            <div className="mt-4">
              {statusEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tasks in this project yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {statusEntries.map(([status, count]) => (
                    <div
                      key={status}
                      className="rounded-lg border border-[var(--glass-border)] bg-card/40 p-3"
                    >
                      <div className="font-display text-xl font-semibold tabular-nums">
                        {count}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {humanize(status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Tasks + assigned team + completion */}
          <GlassCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ListChecks className="size-4 text-primary" />
                Tasks
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {pct}% complete · {p.tasksDone}/{p.tasksTotal} done
              </span>
            </div>
            <div className="mt-4">
              {!p.tasks || p.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tasks in this project yet.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--glass-border)]">
                  {p.tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "grid size-5 shrink-0 place-items-center rounded-full border",
                            t.done
                              ? "border-transparent bg-[var(--success)] text-white"
                              : "border-[var(--glass-border)] text-transparent",
                          )}
                        >
                          <Check className="size-3" />
                        </span>
                        <span
                          className={cn(
                            "truncate text-sm",
                            t.done && "text-muted-foreground line-through",
                          )}
                        >
                          {t.title}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        {t.assignees.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Unassigned
                          </span>
                        ) : (
                          <div className="flex -space-x-1.5">
                            {t.assignees.slice(0, 3).map((a) => (
                              <span
                                key={a.id}
                                title={a.name}
                                className="grid size-6 place-items-center rounded-full border border-background bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[10px] font-bold text-accent"
                              >
                                {initials(a.name)}
                              </span>
                            ))}
                            {t.assignees.length > 3 && (
                              <span className="grid size-6 place-items-center rounded-full border border-background bg-muted text-[10px] font-semibold text-muted-foreground">
                                +{t.assignees.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <StatusPill
                          status={t.status}
                          className="hidden sm:inline-flex"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </GlassCard>

          {/* Milestones */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Flag className="size-4 text-primary" />
              Milestones
            </div>
            <div className="mt-4">
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No milestones have been set for this project.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--glass-border)]">
                  {milestones.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.title}</p>
                        {m.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {formatDate(m.dueDate)}
                          </p>
                        )}
                      </div>
                      <StatusPill status={m.status} className="shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Team */}
        <TeamPanel projectId={projectId} />
      </div>
    </div>
  );
}
