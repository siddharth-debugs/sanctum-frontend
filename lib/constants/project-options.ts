import type { SelectOption } from "@/components/fields";
import type {
  ProjectType,
  ProjectStatus,
  ProjectHealth,
  ProjectTaskStatus,
  ProjectTaskPriority,
  ProjectLabelColor,
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

/* ------------------------------------------------------------------ */
/* Label colours — the seven-token palette (spec §6.3). Two reuse the   */
/* Evergreen theme tokens (pine=primary, brass=accent) so they re-skin  */
/* per theme/mode; the other five carry a fixed mid-tone hex that reads  */
/* on both the light and dark Evergreen surfaces. Each entry exposes a   */
/* raw `color` (for dots / `bg-current`) and a ready-to-spread `chip`    */
/* className — `bg-<token>/12 text-<token>` — built with color-mix so    */
/* one `LabelChip` renders every colour identically everywhere.          */
/* ------------------------------------------------------------------ */

export interface LabelColorMeta {
  /** Human label for the colour swatch in the label editor. */
  label: string;
  /** Raw CSS colour expression (token var or hex) — dots, `bg-current`. */
  color: string;
  /** Pill className: 12%-tint background + solid foreground text. */
  chip: string;
}

/**
 * Build the chip className for a raw colour expression: a 12% tint fill plus
 * the solid colour as text, matching the spec's `bg-<token>/12 text-<token>`.
 */
function labelChipClass(color: string): string {
  return `bg-[color-mix(in_srgb,${color}_12%,transparent)] text-[${color}]`;
}

export const LABEL_COLORS: Record<ProjectLabelColor, LabelColorMeta> = {
  pine: {
    label: "Pine",
    color: "var(--primary)",
    chip: labelChipClass("var(--primary)"),
  },
  brass: {
    label: "Brass",
    color: "var(--accent)",
    chip: labelChipClass("var(--accent)"),
  },
  sky: {
    label: "Sky",
    color: "#2f7fb8",
    chip: labelChipClass("#2f7fb8"),
  },
  rose: {
    label: "Rose",
    color: "#c2456a",
    chip: labelChipClass("#c2456a"),
  },
  amber: {
    label: "Amber",
    color: "#b7791f",
    chip: labelChipClass("#b7791f"),
  },
  violet: {
    label: "Violet",
    color: "#7c5cbf",
    chip: labelChipClass("#7c5cbf"),
  },
  slate: {
    label: "Slate",
    color: "#5c6a72",
    chip: labelChipClass("#5c6a72"),
  },
};

/** Ordered colour tokens for the swatch picker. */
export const LABEL_COLOR_VALUES: ProjectLabelColor[] = [
  "pine",
  "brass",
  "sky",
  "rose",
  "amber",
  "violet",
  "slate",
];

/* ------------------------------------------------------------------ */
/* Priority — semantic icon + token colour (spec §6.2). none/low read    */
/* muted, medium = primary (pine), high = warning, urgent = destructive. */
/* `bars` drives the bar-glyph height (0 = hollow), `flag` marks urgent.  */
/* `color` is a raw CSS colour expression for the glyph + accents.        */
/* ------------------------------------------------------------------ */

export interface PriorityMeta {
  value: ProjectTaskPriority;
  label: string;
  /** Raw CSS colour expression (Evergreen token) for the glyph. */
  color: string;
  /** Filled bars in the icon (0–3); urgent renders a flag instead. */
  bars: 0 | 1 | 2 | 3;
  /** True only for `urgent` — render the filled flag glyph. */
  flag: boolean;
}

/** Ordered low→high; index also encodes rank for sorting. */
export const PRIORITY_META: Record<ProjectTaskPriority, PriorityMeta> = {
  none: {
    value: "none",
    label: "No priority",
    color: "var(--muted-foreground)",
    bars: 0,
    flag: false,
  },
  low: {
    value: "low",
    label: "Low",
    color: "var(--muted-foreground)",
    bars: 1,
    flag: false,
  },
  medium: {
    value: "medium",
    label: "Medium",
    color: "var(--primary)",
    bars: 2,
    flag: false,
  },
  high: {
    value: "high",
    label: "High",
    color: "var(--warning)",
    bars: 3,
    flag: false,
  },
  urgent: {
    value: "urgent",
    label: "Urgent",
    color: "var(--destructive)",
    bars: 3,
    flag: true,
  },
};

/** Select options ordered urgent→none (highest first, matching pickers). */
export const PRIORITY_OPTIONS: SelectOption[] = [
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
  { label: "No priority", value: "none" },
];

/** Numeric rank for sorting (urgent highest). */
export const PRIORITY_RANK: Record<ProjectTaskPriority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

/* ------------------------------------------------------------------ */
/* Estimate — minutes in, human "2h 30m" out (spec §4.2 estimate-input). */
/* ------------------------------------------------------------------ */

/**
 * Format a whole-minute estimate as a compact "2h 30m" string. Returns "—"
 * for null/undefined/0 so empty cells read as unset, "45m" under an hour,
 * "3h" on the hour, and "2h 30m" otherwise.
 */
export function formatEstimate(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Parse a free-text estimate ("2h 30m", "90m", "1.5h", "90") into whole
 * minutes, or null when blank/unparseable. Bare numbers are read as minutes.
 */
export function parseEstimate(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  // Bare number → minutes.
  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = Math.round(parseFloat(t));
    return n > 0 ? n : null;
  }
  let total = 0;
  let matched = false;
  const hours = t.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hours) {
    total += Math.round(parseFloat(hours[1]) * 60);
    matched = true;
  }
  const mins = t.match(/(\d+)\s*m/);
  if (mins) {
    total += parseInt(mins[1], 10);
    matched = true;
  }
  if (!matched || total <= 0) return null;
  return total;
}

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
