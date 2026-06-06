import type { SelectOption } from "@/components/fields";
import type {
  ProjectType,
  ProjectStatus,
  ProjectHealth,
  ProjectTaskStatus,
} from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Task status — the canonical 5-column workflow used by the project   */
/* Tasks tab AND the milestone × status board. Each carries a label    */
/* and an Evergreen-token dot class for its column / card accent.      */
/* ------------------------------------------------------------------ */

export interface TaskStatusMeta {
  value: ProjectTaskStatus;
  label: string;
  /** CSS color expression for the column dot + accents (Evergreen tokens). */
  dot: string;
}

/** Ordered left→right exactly as the board columns render. */
export const TASK_STATUSES: TaskStatusMeta[] = [
  { value: "backlog", label: "Backlog", dot: "var(--muted-foreground)" },
  { value: "todo", label: "To Do", dot: "var(--primary)" },
  { value: "in_progress", label: "In Progress", dot: "var(--accent)" },
  { value: "in_review", label: "In Review", dot: "var(--warning)" },
  { value: "done", label: "Done", dot: "var(--success)" },
];

export const TASK_STATUS_OPTIONS: SelectOption[] = TASK_STATUSES.map((s) => ({
  label: s.label,
  value: s.value,
}));

export const TASK_STATUS_LABEL: Record<ProjectTaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const TASK_STATUS_DOT: Record<ProjectTaskStatus, string> = {
  backlog: "var(--muted-foreground)",
  todo: "var(--primary)",
  in_progress: "var(--accent)",
  in_review: "var(--warning)",
  done: "var(--success)",
};

/** Project type select options + label lookup. */
export const PROJECT_TYPE_OPTIONS: SelectOption[] = [
  { label: "Fixed price", value: "fixed_price" },
  { label: "Retainer", value: "retainer" },
  { label: "Hourly", value: "hourly" },
  { label: "Milestone based", value: "milestone_based" },
];

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  fixed_price: "Fixed price",
  retainer: "Retainer",
  hourly: "Hourly",
  milestone_based: "Milestone based",
};

/** Project status select options + label lookup. */
export const PROJECT_STATUS_OPTIONS: SelectOption[] = [
  { label: "Planning", value: "planning" },
  { label: "Active", value: "active" },
  { label: "On hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Project health select options + label lookup. */
export const PROJECT_HEALTH_OPTIONS: SelectOption[] = [
  { label: "On track", value: "on_track" },
  { label: "At risk", value: "at_risk" },
  { label: "Off track", value: "off_track" },
];

export const PROJECT_HEALTH_LABEL: Record<ProjectHealth, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};

/** Format an INR contract value compactly (₹1.2L, ₹3.4Cr, ₹45,000). */
export function formatCurrency(
  value: number | null | undefined,
  currency = "INR",
): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
