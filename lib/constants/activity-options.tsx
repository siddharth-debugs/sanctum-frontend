import * as React from "react";
import {
  Activity as ActivityIcon,
  CheckCircle2,
  CirclePlus,
  Flag,
  Pencil,
  Play,
  Square,
  Trash2,
  UserPlus,
  UserMinus,
} from "lucide-react";

import { TASK_STATUS_LABEL } from "@/lib/constants/project-options";
import { fmtDuration } from "@/hooks/use-timers";
import type { ProjectActivity, ProjectTaskStatus } from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Activity feed — map a dotted `action` + `metadata` into an icon and  */
/* a human-readable, past-tense summary. Kept here so the Overview feed  */
/* and the full Activity tab render every event identically.            */
/* ------------------------------------------------------------------ */

/** Pull a string field out of the loosely-typed metadata bag. */
function str(meta: Record<string, unknown> | null, key: string): string | undefined {
  const v = meta?.[key];
  return typeof v === "string" ? v : undefined;
}

function num(meta: Record<string, unknown> | null, key: string): number | undefined {
  const v = meta?.[key];
  return typeof v === "number" ? v : undefined;
}

function statusLabel(s: string | undefined): string {
  if (!s) return "—";
  return TASK_STATUS_LABEL[s as ProjectTaskStatus] ?? s;
}

/** Quote a title, falling back to a generic noun when metadata is missing. */
function q(title: string | undefined, fallback: string): string {
  return title ? `“${title}”` : fallback;
}

export interface ActivityView {
  icon: React.ReactNode;
  /** The summary WITHOUT the leading actor name (e.g. "created task “Moodboard”"). */
  summary: React.ReactNode;
  /** A token tint for the icon chip. */
  tone: "primary" | "accent" | "success" | "warning" | "destructive" | "muted";
}

const ICON = "size-3.5";

/**
 * Build the icon + readable summary for one activity row. The summary is phrased
 * as a continuation of the actor's name ("<actor> " + summary).
 */
export function describeActivity(a: ProjectActivity): ActivityView {
  const m = a.metadata ?? null;

  switch (a.action) {
    case "task.create":
      return {
        icon: <CirclePlus className={ICON} />,
        tone: "primary",
        summary: <>created task {q(str(m, "taskTitle"), "a task")}</>,
      };
    case "task.status_change":
      return {
        icon: <ActivityIcon className={ICON} />,
        tone: "accent",
        summary: (
          <>
            moved {q(str(m, "taskTitle"), "a task")} from{" "}
            <span className="font-medium text-foreground">
              {statusLabel(str(m, "fromStatus"))}
            </span>{" "}
            →{" "}
            <span className="font-medium text-foreground">
              {statusLabel(str(m, "toStatus"))}
            </span>
          </>
        ),
      };
    case "task.update":
      return {
        icon: <Pencil className={ICON} />,
        tone: "muted",
        summary: <>updated task {q(str(m, "taskTitle"), "a task")}</>,
      };
    case "task.delete":
      return {
        icon: <Trash2 className={ICON} />,
        tone: "destructive",
        summary: <>deleted task {q(str(m, "taskTitle"), "a task")}</>,
      };
    case "milestone.create":
      return {
        icon: <Flag className={ICON} />,
        tone: "primary",
        summary: <>created milestone {q(str(m, "milestoneTitle") ?? str(m, "title"), "a milestone")}</>,
      };
    case "milestone.complete":
      return {
        icon: <CheckCircle2 className={ICON} />,
        tone: "success",
        summary: <>completed milestone {q(str(m, "milestoneTitle") ?? str(m, "title"), "a milestone")}</>,
      };
    case "milestone.update":
      return {
        icon: <Pencil className={ICON} />,
        tone: "muted",
        summary: <>updated milestone {q(str(m, "milestoneTitle") ?? str(m, "title"), "a milestone")}</>,
      };
    case "milestone.delete":
      return {
        icon: <Trash2 className={ICON} />,
        tone: "destructive",
        summary: <>deleted milestone {q(str(m, "milestoneTitle") ?? str(m, "title"), "a milestone")}</>,
      };
    case "member.add":
      return {
        icon: <UserPlus className={ICON} />,
        tone: "primary",
        summary: (
          <>
            added{" "}
            <span className="font-medium text-foreground">
              {str(m, "memberName") ?? str(m, "userName") ?? "a teammate"}
            </span>{" "}
            to the team
          </>
        ),
      };
    case "member.remove":
      return {
        icon: <UserMinus className={ICON} />,
        tone: "warning",
        summary: (
          <>
            removed{" "}
            <span className="font-medium text-foreground">
              {str(m, "memberName") ?? str(m, "userName") ?? "a teammate"}
            </span>{" "}
            from the team
          </>
        ),
      };
    case "timer.start":
      return {
        icon: <Play className={ICON} />,
        tone: "success",
        summary: (
          <>
            started a timer on {q(str(m, "taskTitle"), "this project")}
          </>
        ),
      };
    case "timer.stop": {
      const mins = num(m, "minutes");
      return {
        icon: <Square className={ICON} />,
        tone: "muted",
        summary: (
          <>
            stopped a timer on {q(str(m, "taskTitle"), "this project")}
            {mins != null && (
              <span className="ml-1 font-medium tabular-nums text-foreground">
                (+{fmtDuration(mins)})
              </span>
            )}
          </>
        ),
      };
    }
    case "project.update":
      return {
        icon: <Pencil className={ICON} />,
        tone: "muted",
        summary: <>updated the project</>,
      };
    default:
      return {
        icon: <ActivityIcon className={ICON} />,
        tone: "muted",
        summary: <>{a.action.replace(/[._]/g, " ")}</>,
      };
  }
}

export const ACTIVITY_TONE_CLASS: Record<ActivityView["tone"], string> = {
  primary: "text-primary bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]",
  accent: "text-accent bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]",
  success: "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]",
  warning: "text-warning bg-[color-mix(in_srgb,var(--warning)_18%,transparent)]",
  destructive:
    "text-destructive bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)]",
  muted:
    "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)]",
};
