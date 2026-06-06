import Link from "next/link";

import { GlassCard } from "@/components/app/glass-card";
import { Progress } from "@/components/ui/progress";
import {
  ProjectStatusBadge,
  ProjectHealthBadge,
  ProjectTypeBadge,
} from "@/components/app/project-badges";
import { formatCurrency } from "@/lib/constants/project-options";
import type { Project } from "@/lib/api/types";

/** Compact card used in the projects grid and the client Projects tab. */
export function ProjectCard({
  project,
  /** Hide the client link (e.g. when shown inside a client's own page). */
  hideClient = false,
}: {
  project: Project;
  hideClient?: boolean;
}) {
  const pct =
    project.tasksTotal > 0
      ? Math.round((project.tasksDone / project.tasksTotal) * 100)
      : 0;

  return (
    <GlassCard className="relative flex cursor-pointer flex-col gap-4 p-5 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--glass-border))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {/* Stretched link: the whole card navigates to the project. */}
          <Link
            href={`/projects/${project.id}`}
            className="block truncate font-display text-base font-semibold tracking-tight hover:text-primary after:absolute after:inset-0 after:content-['']"
          >
            {project.name}
          </Link>
          {!hideClient && (
            <Link
              href={`/clients/${project.clientId}`}
              className="relative z-10 block truncate text-xs text-muted-foreground hover:text-foreground"
            >
              {project.clientName}
            </Link>
          )}
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatCurrency(project.contractValue, project.currency)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ProjectStatusBadge status={project.status} />
        <ProjectHealthBadge health={project.health} />
        <ProjectTypeBadge type={project.type} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {project.tasksDone}/{project.tasksTotal} tasks
          </span>
          <span className="font-semibold text-foreground">{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {project.milestonesDone}/{project.milestonesTotal} milestones
        </span>
        <span>
          {project.memberCount} member{project.memberCount === 1 ? "" : "s"}
        </span>
      </div>
    </GlassCard>
  );
}
