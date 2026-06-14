"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarPlus, CornerDownLeft, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePickerPresets } from "@/components/fields/date-picker/date-picker-presets";
import {
  DEFAULT_PRESETS,
  startOfDay,
} from "@/components/fields/date-picker/date-picker.utils";
import {
  AssigneeAvatar,
  DueChip,
  PriorityIcon,
} from "@/components/app/tasks";
import { PRIORITY_META } from "@/lib/constants/project-options";
import { ApiError } from "@/lib/api/client";
import { useProjectMembers } from "@/hooks/use-project-members";
import { useCreateProjectTask } from "@/hooks/use-project-tasks";
import type {
  ProjectMember,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@/lib/api/types";

export interface TaskQuickAddProps {
  projectId: string;
  /** Status new tasks land in (defaults to the first column / "backlog"). */
  defaultStatus?: ProjectTaskStatus;
  /** Milestone new tasks file under, when the active group fixes one. */
  defaultMilestoneId?: string | null;
  className?: string;
}

/** Map `!token` → priority. Accepts a few friendly aliases. */
const PRIORITY_TOKENS: Record<string, ProjectTaskPriority> = {
  urgent: "urgent",
  u: "urgent",
  high: "high",
  h: "high",
  medium: "medium",
  med: "medium",
  m: "medium",
  low: "low",
  l: "low",
  none: "none",
};

interface ParsedDraft {
  /** Title with the `!priority` / `@assignee` tokens stripped out. */
  title: string;
  priority: ProjectTaskPriority;
  assignee: ProjectMember | null;
  /** A raw `@token` that matched no member (surface as a hint). */
  unknownAssignee: string | null;
}

/**
 * Parse the raw input into a title + inline `!priority` and `@assignee` tokens.
 * The LAST matching token of each kind wins; matched tokens are removed from the
 * title. Assignee matching is case-insensitive on the member's name (first word
 * or the full name with `_`/spaces collapsed).
 */
function parseDraft(raw: string, members: ProjectMember[]): ParsedDraft {
  let priority: ProjectTaskPriority = "none";
  let assignee: ProjectMember | null = null;
  let unknownAssignee: string | null = null;

  // `!high` → priority (strip the token).
  const titleNoPriority = raw.replace(/(^|\s)!([a-z]+)\b/gi, (m, pre, tok) => {
    const mapped = PRIORITY_TOKENS[tok.toLowerCase()];
    if (mapped) {
      priority = mapped;
      return pre; // drop the token, keep the leading space
    }
    return m; // unknown token — leave it in the title
  });

  // `@name` → assignee (strip the token).
  const title = titleNoPriority
    .replace(/(^|\s)@([\w.-]+)\b/g, (m, pre, tok) => {
      const lower = tok.toLowerCase();
      const match = members.find((mem) => {
        const name = mem.userName.toLowerCase();
        const first = name.split(/\s+/)[0];
        const collapsed = name.replace(/\s+/g, "");
        return first === lower || collapsed === lower || name === lower;
      });
      if (match) {
        assignee = match;
        return pre;
      }
      unknownAssignee = tok;
      return m;
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  return { title, priority, assignee, unknownAssignee };
}

/**
 * Inline quick-add (spec §4.2). A single text input that parses `!priority` and
 * `@assignee` tokens as you type — live chips preview the parsed priority glyph,
 * assignee avatar and (optionally) a due date set via a small calendar popover.
 * Enter creates the task optimistically; the input clears and stays focused for
 * rapid entry. Errors roll back via the mutation and surface a toast.
 */
export function TaskQuickAdd({
  projectId,
  defaultStatus = "backlog",
  defaultMilestoneId = null,
  className,
}: TaskQuickAddProps) {
  const [raw, setRaw] = React.useState("");
  const [due, setDue] = React.useState<Date | null>(null);
  const [dateOpen, setDateOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data: members = [] } = useProjectMembers(projectId);
  const createTask = useCreateProjectTask(projectId);
  const today = React.useMemo(() => startOfDay(new Date()), []);

  const parsed = React.useMemo(
    () => parseDraft(raw, members),
    [raw, members],
  );

  const canSubmit = parsed.title.length > 0 && !createTask.isPending;

  const submit = React.useCallback(() => {
    if (!parsed.title || createTask.isPending) return;
    createTask.mutate(
      {
        title: parsed.title,
        status: defaultStatus,
        milestoneId: defaultMilestoneId,
        priority: parsed.priority,
        assigneeId: parsed.assignee?.userId ?? null,
        dueDate: due ? format(due, "yyyy-MM-dd") : null,
      },
      {
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add task",
          ),
      },
    );
    // Optimistic UX: clear immediately and keep focus for the next task.
    setRaw("");
    setDue(null);
    inputRef.current?.focus();
  }, [parsed, due, createTask, defaultStatus, defaultMilestoneId]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/40",
        className,
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center text-muted-foreground">
        {createTask.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="size-4" aria-hidden />
        )}
      </span>

      <input
        ref={inputRef}
        value={raw}
        aria-label="Add a task"
        placeholder="Add a task…  try !high  @name"
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setRaw("");
            setDue(null);
          }
        }}
        className="h-9 min-w-40 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />

      {/* Parsed-token preview chips. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {parsed.priority !== "none" && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
            title={`Priority: ${PRIORITY_META[parsed.priority].label}`}
          >
            <PriorityIcon priority={parsed.priority} hideLabel />
            {PRIORITY_META[parsed.priority].label}
          </span>
        )}
        {parsed.assignee && (
          <span
            className="inline-flex items-center"
            title={`Assignee: ${parsed.assignee.userName}`}
          >
            <AssigneeAvatar name={parsed.assignee.userName} size="sm" />
          </span>
        )}
        {parsed.unknownAssignee && !parsed.assignee && (
          <span className="text-xs text-muted-foreground">
            @{parsed.unknownAssignee}?
          </span>
        )}

        {/* Due-date popover. */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={due ? `Due ${format(due, "d MMM")}` : "Set due date"}
              className={cn("h-8 gap-1.5", due && "text-foreground")}
            >
              {due ? (
                <>
                  <DueChip date={due.toISOString()} />
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label="Clear due date"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDue(null);
                    }}
                    className="grid size-4 place-items-center rounded-sm opacity-60 hover:opacity-100"
                  >
                    <X className="size-3" />
                  </span>
                </>
              ) : (
                <CalendarPlus className="size-4 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            collisionPadding={8}
            className="w-[min(520px,90vw)] overflow-hidden p-0"
          >
            <div className="flex flex-col sm:flex-row">
              <DatePickerPresets
                className="hidden sm:flex"
                presets={DEFAULT_PRESETS}
                today={today}
                selected={due ?? undefined}
                variant="sidebar"
                onSelect={(d) => {
                  setDue(d);
                  setDateOpen(false);
                }}
              />
              <DatePickerPresets
                className="flex sm:hidden"
                presets={DEFAULT_PRESETS}
                today={today}
                selected={due ?? undefined}
                variant="chips"
                onSelect={(d) => {
                  setDue(d);
                  setDateOpen(false);
                }}
              />
              <Calendar
                mode="single"
                className="p-3"
                selected={due ?? undefined}
                defaultMonth={due ?? today}
                onSelect={(d) => {
                  setDue(d ?? null);
                  setDateOpen(false);
                }}
                modifiers={{ today }}
                classNames={{
                  today:
                    "rounded-md bg-transparent font-semibold text-foreground ring-1 ring-inset ring-accent data-[selected=true]:ring-2",
                }}
                autoFocus
              />
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={submit}
          className="h-9"
        >
          Add
          <CornerDownLeft className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
