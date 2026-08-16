import Link from "next/link";
import { CalendarClock, CheckCircle2 } from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { formatDate } from "@/lib/utils";
import type { ClientProject } from "@/lib/api/types";
import { HealthPill, ProgressBar, StatusPill } from "./portal-bits";

/** Clickable project card used on the Overview and Projects pages. */
export function PortalProjectCard({ project }: { project: ClientProject }) {
  const pct =
    project.progress ??
    (project.tasksTotal > 0
      ? Math.round((project.tasksDone / project.tasksTotal) * 100)
      : 0);

  return (
    <GlassCard className="group relative flex flex-col gap-4 p-5 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--glass-border))]">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/client/projects/${project.id}`}
          className="min-w-0 font-display text-base font-semibold tracking-tight after:absolute after:inset-0 after:content-[''] group-hover:text-primary"
        >
          <span className="block truncate">{project.name}</span>
        </Link>
        <span className="shrink-0 font-display text-sm font-semibold tabular-nums">
          {pct}%
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill status={project.status} />
        <HealthPill health={project.health} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            {project.tasksDone}/{project.tasksTotal} tasks
          </span>
        </div>
        <ProgressBar pct={pct} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          {project.deadline ? `Due ${formatDate(project.deadline)}` : "No deadline"}
        </span>
        {project.startDate && <span>Started {formatDate(project.startDate)}</span>}
      </div>
    </GlassCard>
  );
}
