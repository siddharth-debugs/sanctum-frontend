import * as React from "react";

import { PriorityIcon } from "@/components/app/tasks";
import {
  TASK_STATUSES,
  PRIORITY_OPTIONS,
  PRIORITY_RANK,
  LABEL_COLORS,
  TASK_STATUS_DOT,
} from "@/lib/constants/project-options";
import type {
  ProjectTask,
  ProjectMember,
  ProjectMilestone,
  ProjectLabel,
  ProjectTaskPriority,
} from "@/lib/api/types";
import type { ProjectTaskGroup } from "@/hooks/use-project-tasks";

/**
 * Shared view contract + grouping helpers for the three task views (Board /
 * List / Table). The shell runs ONE flexible-list query and passes the flat,
 * already-filtered/sorted `tasks` plus the lookup collections; each view buckets
 * client-side via `buildGroups` so all three agree on column order and labels.
 */
export interface TaskViewProps {
  projectId: string;
  /** Flat, enriched, already filtered + sorted task list from the shell query. */
  tasks: ProjectTask[];
  /** Active group axis. */
  group: ProjectTaskGroup;
  /** Project members (assignee column labels/avatars). */
  members: ProjectMember[];
  /** Project milestones (milestone column labels). */
  milestones: ProjectMilestone[];
  /** Project labels (label column chips). */
  labels: ProjectLabel[];
  /** Open the task detail sheet — the shell owns the sheet. */
  onOpenTask: (taskId: string) => void;
}

/** Collections needed to resolve human column labels/accents. */
export interface GroupLookups {
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  labels: ProjectLabel[];
}

/** One rendered group: a stable key, a label, an optional accent node, tasks. */
export interface TaskGroupColumn {
  key: string;
  label: string;
  /** Small leading accent (status dot, priority glyph, label chip…). */
  accent: React.ReactNode;
  tasks: ProjectTask[];
}

/** Sentinel key for the "unset" bucket (no assignee / no milestone / etc.). */
export const NONE_GROUP_KEY = "__none__";

/**
 * All assignee user ids on a task — prefers the full `assignees` set, falling
 * back to the legacy single `assigneeId` when the array is absent.
 */
export function taskAssigneeIds(task: ProjectTask): string[] {
  if (task.assignees && task.assignees.length > 0)
    return task.assignees.map((a) => a.userId);
  return task.assigneeId ? [task.assigneeId] : [];
}

/** Drag-to-recategorize is only meaningful for single-valued scalar fields. */
export function groupableDrag(group: ProjectTaskGroup): boolean {
  return (
    group === "status" ||
    group === "assignee" ||
    group === "priority" ||
    group === "milestone"
  );
}

/** A coloured dot accent (status / generic). */
function dot(color: string): React.ReactNode {
  return React.createElement("span", {
    "aria-hidden": true,
    className: "size-2 shrink-0 rounded-full",
    style: { backgroundColor: color },
  });
}

/** The shared priority glyph accent for the priority group axis (spec §6.2). */
function priorityGlyph(priority: ProjectTaskPriority): React.ReactNode {
  return React.createElement(PriorityIcon, { priority, hideLabel: true });
}

/**
 * Bucket a flat task list into ordered columns for the active group axis. Empty
 * scalar buckets (every status / every priority) are kept so the board always
 * shows the full workflow; assignee/milestone/label only render buckets that
 * have tasks (plus a trailing "Unassigned/None" when relevant). Task order
 * inside each bucket is preserved from the incoming (already-sorted) list.
 */
export function buildGroups(
  tasks: ProjectTask[],
  group: ProjectTaskGroup,
  lookups: GroupLookups,
): TaskGroupColumn[] {
  if (group === "none") {
    return [
      {
        key: "all",
        label: "All tasks",
        accent: null,
        tasks: [...tasks],
      },
    ];
  }

  if (group === "status") {
    return TASK_STATUSES.map((s) => ({
      key: s.value,
      label: s.label,
      accent: dot(TASK_STATUS_DOT[s.value]),
      tasks: tasks.filter((t) => t.status === s.value),
    }));
  }

  if (group === "priority") {
    // Highest → lowest (urgent first), matching the pickers.
    return PRIORITY_OPTIONS.map((o) => {
      const p = o.value as ProjectTaskPriority;
      return {
        key: p,
        label: o.label,
        accent: priorityGlyph(p),
        tasks: tasks.filter((t) => t.priority === p),
      };
    }).sort(
      (a, b) =>
        PRIORITY_RANK[b.key as ProjectTaskPriority] -
        PRIORITY_RANK[a.key as ProjectTaskPriority],
    );
  }

  if (group === "assignee") {
    // A task may have MANY assignees, so (like labels) it can appear under each
    // of them; a trailing "Unassigned" bucket catches tasks with no assignee.
    const cols: TaskGroupColumn[] = [];
    for (const m of lookups.members) {
      const bucket = tasks.filter((t) =>
        taskAssigneeIds(t).includes(m.userId),
      );
      if (bucket.length === 0) continue;
      cols.push({
        key: m.userId,
        label: m.userName,
        accent: null,
        tasks: bucket,
      });
    }
    const unassigned = tasks.filter((t) => taskAssigneeIds(t).length === 0);
    if (unassigned.length > 0) {
      cols.push({
        key: NONE_GROUP_KEY,
        label: "Unassigned",
        accent: null,
        tasks: unassigned,
      });
    }
    return cols;
  }

  if (group === "milestone") {
    const cols: TaskGroupColumn[] = [];
    const sorted = [...lookups.milestones].sort(
      (a, b) => a.position - b.position,
    );
    for (const m of sorted) {
      const bucket = tasks.filter((t) => t.milestoneId === m.id);
      if (bucket.length === 0) continue;
      cols.push({ key: m.id, label: m.title, accent: null, tasks: bucket });
    }
    const none = tasks.filter((t) => !t.milestoneId);
    if (none.length > 0) {
      cols.push({
        key: NONE_GROUP_KEY,
        label: "No milestone",
        accent: null,
        tasks: none,
      });
    }
    return cols;
  }

  // group === "label" — a task may carry many labels, so it can appear in
  // multiple buckets; an "Unlabeled" trailing bucket catches the rest.
  const cols: TaskGroupColumn[] = [];
  for (const l of lookups.labels) {
    const bucket = tasks.filter((t) =>
      (t.labels ?? []).some((tl) => tl.id === l.id),
    );
    if (bucket.length === 0) continue;
    const meta = LABEL_COLORS[l.color] ?? LABEL_COLORS.slate;
    cols.push({
      key: l.id,
      label: l.name,
      accent: dot(meta.color),
      tasks: bucket,
    });
  }
  const unlabeled = tasks.filter((t) => (t.labels ?? []).length === 0);
  if (unlabeled.length > 0) {
    cols.push({
      key: NONE_GROUP_KEY,
      label: "Unlabeled",
      accent: null,
      tasks: unlabeled,
    });
  }
  return cols;
}
