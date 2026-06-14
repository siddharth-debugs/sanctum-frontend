"use client";

import * as React from "react";
import {
  ArrowDownUp,
  Check,
  Filter,
  Group as GroupIcon,
  Search,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ViewSwitcher,
  PriorityIcon,
  StatusBadge,
  AssigneeAvatar,
  LabelChip,
  type TaskView,
} from "@/components/app/tasks";
import {
  TASK_STATUSES,
  PRIORITY_OPTIONS,
} from "@/lib/constants/project-options";
import { useProjectMembers } from "@/hooks/use-project-members";
import { useProjectMilestones } from "@/hooks/use-project-milestones";
import { useProjectLabels } from "@/hooks/use-task-labels";
import type {
  ProjectTaskGroup,
  ProjectTaskSort,
  ProjectTaskDueFilter,
} from "@/hooks/use-project-tasks";
import type {
  ProjectTaskStatus,
  ProjectTaskPriority,
} from "@/lib/api/types";

/**
 * The controlled filter set the toolbar edits and every view reads. Owned by the
 * shell (tasks-tab.tsx), persisted to localStorage; the toolbar is pure.
 */
export interface TaskFilters {
  status: ProjectTaskStatus[];
  /** User ids OR the literal "unassigned". */
  assignee: string[];
  priority: ProjectTaskPriority[];
  /** Label ids. */
  label: string[];
  /** Milestone ids. */
  milestone: string[];
  due: ProjectTaskDueFilter | null;
  q: string;
}

/** A blank filter set — re-exported so the shell can seed/reset its state. */
export const EMPTY_TASK_FILTERS: TaskFilters = {
  status: [],
  assignee: [],
  priority: [],
  label: [],
  milestone: [],
  due: null,
  q: "",
};

/** Count of active facets (drives the filter badge + "Clear" affordance). */
export function countActiveFilters(f: TaskFilters): number {
  return (
    f.status.length +
    f.assignee.length +
    f.priority.length +
    f.label.length +
    f.milestone.length +
    (f.due ? 1 : 0) +
    (f.q.trim() ? 1 : 0)
  );
}

const GROUP_OPTIONS: { value: ProjectTaskGroup; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "label", label: "Label" },
  { value: "milestone", label: "Milestone" },
  { value: "none", label: "No grouping" },
];

const SORT_OPTIONS: { value: ProjectTaskSort; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due date" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "title", label: "Title" },
];

const DUE_OPTIONS: { value: ProjectTaskDueFilter; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Due this week" },
  { value: "none", label: "No due date" },
];

export interface TaskToolbarProps {
  projectId: string;
  /** Current view (Board / List / Table) — controlled. */
  view: TaskView;
  onViewChange: (view: TaskView) => void;
  /** Current group axis — controlled. */
  group: ProjectTaskGroup;
  onGroupChange: (group: ProjectTaskGroup) => void;
  /** Current filter set — controlled. */
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  /** Current sort axis + direction — controlled. */
  sort: ProjectTaskSort;
  dir: "asc" | "desc";
  onSortChange: (sort: ProjectTaskSort, dir: "asc" | "desc") => void;
  className?: string;
}

/**
 * Tasks-tab toolbar (spec §4.2): left → the Board/List/Table view switcher;
 * right → a Group-by select, a multi-facet Filter popover (status / assignee /
 * priority / label / milestone / due preset + a search box) and a Sort select
 * with a direction toggle. Fully controlled — it renders the supplied state and
 * calls back; the shell owns persistence. Reuses the shared task atoms so the
 * filter chips match the cards/rows exactly.
 */
export function TaskToolbar({
  projectId,
  view,
  onViewChange,
  group,
  onGroupChange,
  filters,
  onFiltersChange,
  sort,
  dir,
  onSortChange,
  className,
}: TaskToolbarProps) {
  const activeCount = countActiveFilters(filters);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 sm:gap-3",
        className,
      )}
    >
      <ViewSwitcher value={view} onChange={onViewChange} />

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <GroupBySelect value={group} onChange={onGroupChange} />
        <FilterPopover
          projectId={projectId}
          filters={filters}
          onChange={onFiltersChange}
          activeCount={activeCount}
        />
        <SortSelect sort={sort} dir={dir} onChange={onSortChange} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Group-by                                                            */
/* ------------------------------------------------------------------ */

function GroupBySelect({
  value,
  onChange,
}: {
  value: ProjectTaskGroup;
  onChange: (g: ProjectTaskGroup) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ProjectTaskGroup)}>
      <SelectTrigger
        size="default"
        aria-label="Group tasks by"
        className="h-11 gap-2"
      >
        <GroupIcon className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GROUP_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ */
/* Sort                                                                */
/* ------------------------------------------------------------------ */

function SortSelect({
  sort,
  dir,
  onChange,
}: {
  sort: ProjectTaskSort;
  dir: "asc" | "desc";
  onChange: (sort: ProjectTaskSort, dir: "asc" | "desc") => void;
}) {
  // "Manual" has no meaningful direction — hide the flip toggle for it.
  const showDir = sort !== "manual";
  return (
    <div className="flex items-center gap-1">
      <Select
        value={sort}
        onValueChange={(v) => onChange(v as ProjectTaskSort, dir)}
      >
        <SelectTrigger
          size="default"
          aria-label="Sort tasks by"
          className="h-11 gap-2"
        >
          <ArrowDownUp className="size-4 shrink-0 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showDir && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Sort direction: ${dir === "asc" ? "ascending" : "descending"}`}
          title={dir === "asc" ? "Ascending" : "Descending"}
          onClick={() => onChange(sort, dir === "asc" ? "desc" : "asc")}
          className="size-11 tabular-nums"
        >
          <span aria-hidden className="text-sm font-medium">
            {dir === "asc" ? "↑" : "↓"}
          </span>
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter popover                                                      */
/* ------------------------------------------------------------------ */

function FilterPopover({
  projectId,
  filters,
  onChange,
  activeCount,
}: {
  projectId: string;
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  activeCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const { data: members = [] } = useProjectMembers(projectId);
  const { data: milestones = [] } = useProjectMilestones(projectId);
  const { data: labels = [] } = useProjectLabels(projectId);

  function toggle<T>(list: T[], val: T): T[] {
    return list.includes(val)
      ? list.filter((x) => x !== val)
      : [...list, val];
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label="Filter tasks"
          className="h-11 gap-2"
        >
          <Filter className="size-4 shrink-0 text-muted-foreground" />
          Filter
          {activeCount > 0 && (
            <Badge
              variant="default"
              className="ml-0.5 h-5 min-w-5 justify-center px-1.5 tabular-nums"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={8}
        className="max-h-[min(36rem,80vh)] w-[min(22rem,90vw)] overflow-y-auto p-0"
      >
        {/* Search */}
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              placeholder="Search task titles…"
              aria-label="Search task titles"
              onChange={(e) => onChange({ ...filters, q: e.target.value })}
              className="h-9 pl-8"
            />
          </div>
        </div>

        <div className="space-y-4 p-3">
          {/* Status */}
          <FilterGroup label="Status">
            {TASK_STATUSES.map((s) => (
              <FilterChip
                key={s.value}
                active={filters.status.includes(s.value)}
                onClick={() =>
                  onChange({
                    ...filters,
                    status: toggle(filters.status, s.value),
                  })
                }
              >
                <StatusBadge status={s.value} dotOnly />
                {s.label}
              </FilterChip>
            ))}
          </FilterGroup>

          {/* Priority */}
          <FilterGroup label="Priority">
            {PRIORITY_OPTIONS.map((o) => {
              const p = o.value as ProjectTaskPriority;
              return (
                <FilterChip
                  key={o.value}
                  active={filters.priority.includes(p)}
                  onClick={() =>
                    onChange({
                      ...filters,
                      priority: toggle(filters.priority, p),
                    })
                  }
                >
                  <PriorityIcon priority={p} hideLabel />
                  {o.label}
                </FilterChip>
              );
            })}
          </FilterGroup>

          {/* Assignee */}
          <FilterGroup label="Assignee">
            <FilterChip
              active={filters.assignee.includes("unassigned")}
              onClick={() =>
                onChange({
                  ...filters,
                  assignee: toggle(filters.assignee, "unassigned"),
                })
              }
            >
              <AssigneeAvatar name={null} size="sm" />
              Unassigned
            </FilterChip>
            {members.map((m) => (
              <FilterChip
                key={m.userId}
                active={filters.assignee.includes(m.userId)}
                onClick={() =>
                  onChange({
                    ...filters,
                    assignee: toggle(filters.assignee, m.userId),
                  })
                }
              >
                <AssigneeAvatar name={m.userName} size="sm" />
                {m.userName}
              </FilterChip>
            ))}
          </FilterGroup>

          {/* Labels */}
          {labels.length > 0 && (
            <FilterGroup label="Labels">
              {labels.map((l) => (
                <FilterChip
                  key={l.id}
                  active={filters.label.includes(l.id)}
                  onClick={() =>
                    onChange({
                      ...filters,
                      label: toggle(filters.label, l.id),
                    })
                  }
                >
                  <LabelChip label={l} />
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          {/* Milestone */}
          {milestones.length > 0 && (
            <FilterGroup label="Milestone">
              {milestones.map((m) => (
                <FilterChip
                  key={m.id}
                  active={filters.milestone.includes(m.id)}
                  onClick={() =>
                    onChange({
                      ...filters,
                      milestone: toggle(filters.milestone, m.id),
                    })
                  }
                >
                  {m.title}
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          {/* Due preset (single-select) */}
          <FilterGroup label="Due">
            {DUE_OPTIONS.map((o) => (
              <FilterChip
                key={o.value}
                active={filters.due === o.value}
                onClick={() =>
                  onChange({
                    ...filters,
                    due: filters.due === o.value ? null : o.value,
                  })
                }
              >
                {o.label}
              </FilterChip>
            ))}
          </FilterGroup>
        </div>

        {/* Footer: clear all. */}
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-popover px-3 py-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {activeCount} active
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={activeCount === 0}
            onClick={() => onChange({ ...EMPTY_TASK_FILTERS })}
          >
            <X className="size-3.5" />
            Clear all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-foreground hover:border-primary/40 hover:bg-muted/60",
      )}
    >
      {active && <Check className="size-3 shrink-0" aria-hidden />}
      {children}
    </button>
  );
}
