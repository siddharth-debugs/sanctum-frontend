import { cn } from "@/lib/utils";
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_DOT,
} from "@/lib/constants/project-options";
import type {
  ProjectStatus,
  ProjectHealth,
  ProjectType,
  ProjectTaskStatus,
} from "@/lib/api/types";

/**
 * Project pills using Evergreen tokens tastefully:
 * status — Planning (muted), Active (primary pine), On hold (warning amber),
 * Completed (success emerald), Cancelled (destructive).
 * health — On track (success), At risk (warning), Off track (destructive).
 */
const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  planning: {
    label: "Planning",
    className:
      "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_14%,transparent)]",
  },
  active: {
    label: "Active",
    className:
      "text-primary bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
  },
  on_hold: {
    label: "On hold",
    className:
      "text-warning bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]",
  },
  completed: {
    label: "Completed",
    className:
      "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
  },
};

const HEALTH_CONFIG: Record<
  ProjectHealth,
  { label: string; className: string }
> = {
  on_track: {
    label: "On track",
    className:
      "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]",
  },
  at_risk: {
    label: "At risk",
    className:
      "text-warning bg-[color-mix(in_srgb,var(--warning)_18%,transparent)]",
  },
  off_track: {
    label: "Off track",
    className:
      "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
  },
};

const TYPE_LABEL: Record<ProjectType, string> = {
  fixed_price: "Fixed price",
  retainer: "Retainer",
  hourly: "Hourly",
  milestone_based: "Milestone based",
};

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn(pill, cfg.className, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

export function ProjectHealthBadge({
  health,
  className,
}: {
  health: ProjectHealth;
  className?: string;
}) {
  const cfg = HEALTH_CONFIG[health];
  return (
    <span className={cn(pill, cfg.className, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

export function ProjectTypeBadge({
  type,
  className,
}: {
  type: ProjectType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        pill,
        "text-accent bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]",
        className,
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

/** Task-status pill driven by the canonical 5-status palette (Evergreen dots). */
export function TaskStatusBadge({
  status,
  className,
}: {
  status: ProjectTaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        pill,
        "bg-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] text-foreground/80",
        className,
      )}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: TASK_STATUS_DOT[status] }}
      />
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}
