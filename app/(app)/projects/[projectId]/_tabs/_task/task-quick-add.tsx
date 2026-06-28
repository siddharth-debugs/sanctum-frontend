"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarPlus, CornerDownLeft, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  AssigneeStack,
  DueChip,
  PriorityIcon,
} from "@/components/app/tasks";
import { PRIORITY_META, PRIORITY_OPTIONS } from "@/lib/constants/project-options";
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

/** Priority autocomplete options (highest → lowest), keyed by their `!token`. */
const PRIORITY_SUGGESTIONS: { value: ProjectTaskPriority; label: string }[] =
  PRIORITY_OPTIONS.map((o) => ({
    value: o.value as ProjectTaskPriority,
    label: o.label,
  }));

/** A display name → @token (spaces/`_` collapsed) so the title round-trips. */
function memberToken(name: string): string {
  return name.replace(/\s+/g, "");
}

interface ParsedDraft {
  /** Title with all `!priority` / `@assignee` tokens stripped out. */
  title: string;
  priority: ProjectTaskPriority;
  /** Every matched assignee, de-duplicated, in first-seen order. */
  assignees: ProjectMember[];
  /** Raw `@token`s that matched no member (surface as a hint). */
  unknownAssignees: string[];
}

/** Resolve a raw `@token` to a member (case-insensitive, name-collapsed). */
function matchMember(
  token: string,
  members: ProjectMember[],
): ProjectMember | undefined {
  const lower = token.toLowerCase();
  return members.find((mem) => {
    const name = mem.userName.toLowerCase();
    const first = name.split(/\s+/)[0];
    const collapsed = name.replace(/\s+/g, "");
    return first === lower || collapsed === lower || name === lower;
  });
}

/**
 * Parse the raw input into a title + inline `!priority` and `@assignee` tokens.
 * The LAST matching `!priority` wins; ALL matching `@assignee` tokens are
 * collected (de-duped). Matched tokens are stripped from the title.
 */
function parseDraft(raw: string, members: ProjectMember[]): ParsedDraft {
  let priority: ProjectTaskPriority = "none";
  const assignees: ProjectMember[] = [];
  const seen = new Set<string>();
  const unknownAssignees: string[] = [];

  // `!high` → priority (strip the token).
  const titleNoPriority = raw.replace(/(^|\s)!([a-z]+)\b/gi, (m, pre, tok) => {
    const mapped = PRIORITY_TOKENS[tok.toLowerCase()];
    if (mapped) {
      priority = mapped;
      return pre; // drop the token, keep the leading space
    }
    return m; // unknown token — leave it in the title
  });

  // `@name` → assignee(s) (strip each matched token).
  const title = titleNoPriority
    .replace(/(^|\s)@([\w.-]+)\b/g, (m, pre, tok) => {
      const match = matchMember(tok, members);
      if (match) {
        if (!seen.has(match.userId)) {
          seen.add(match.userId);
          assignees.push(match);
        }
        return pre;
      }
      if (!unknownAssignees.includes(tok)) unknownAssignees.push(tok);
      return m;
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  return { title, priority, assignees, unknownAssignees };
}

/* ------------------------------------------------------------------ */
/* Active-token detection (the `@…` / `!…` word under the caret)        */
/* ------------------------------------------------------------------ */

type ActiveToken =
  | { kind: "assignee"; query: string; start: number }
  | { kind: "priority"; query: string; start: number }
  | null;

/**
 * Find the `@token` or `!token` immediately left of the caret (no trailing
 * space). Returns its kind, the typed query and the position of the trigger
 * char so it can be replaced on pick.
 */
function activeToken(text: string, caret: number): ActiveToken {
  const upto = text.slice(0, caret);
  const at = /(?:^|\s)@([\w.-]*)$/.exec(upto);
  if (at) {
    return { kind: "assignee", query: at[1], start: caret - at[1].length - 1 };
  }
  const bang = /(?:^|\s)!([a-z]*)$/i.exec(upto);
  if (bang) {
    return { kind: "priority", query: bang[1], start: caret - bang[1].length - 1 };
  }
  return null;
}

/**
 * Inline quick-add (spec §4.2). A single text input that parses `!priority` and
 * MULTIPLE `@assignee` tokens as you type, with a live autocomplete dropdown:
 * typing `@` lists project members (filtered by the query) and `!` lists
 * priorities; ↑/↓ move, Enter/Tab pick, Esc dismisses. Picking completes the
 * token in the text so it reads back and is stripped by parsing. Live chips
 * preview the parsed priority glyph and an avatar stack of every assignee plus
 * an optional due date. Enter creates the task optimistically; the input clears
 * and stays focused for rapid entry. Errors roll back and surface a toast.
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
  const [token, setToken] = React.useState<ActiveToken>(null);
  const [highlight, setHighlight] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data: members = [] } = useProjectMembers(projectId);
  const createTask = useCreateProjectTask(projectId);
  const today = React.useMemo(() => startOfDay(new Date()), []);

  const parsed = React.useMemo(
    () => parseDraft(raw, members),
    [raw, members],
  );

  // Suggestions for the active token (members or priorities), filtered live.
  const suggestions = React.useMemo<
    { id: string; label: string; node: React.ReactNode }[]
  >(() => {
    if (!token) return [];
    if (token.kind === "assignee") {
      const q = token.query.toLowerCase();
      return members
        .filter((m) => m.userName.toLowerCase().includes(q))
        .slice(0, 6)
        .map((m) => ({
          id: m.userId,
          label: m.userName,
          node: (
            <span className="flex items-center gap-2">
              <Avatar size="sm">
                <AvatarFallback className="text-[10px]">
                  {initials(m.userName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{m.userName}</span>
            </span>
          ),
        }));
    }
    const q = token.query.toLowerCase();
    return PRIORITY_SUGGESTIONS.filter((p) =>
      p.value.toLowerCase().includes(q) || p.label.toLowerCase().includes(q),
    ).map((p) => ({
      id: p.value,
      label: p.label,
      node: (
        <span className="flex items-center gap-2">
          <PriorityIcon priority={p.value} hideLabel />
          <span className="truncate">{p.label}</span>
        </span>
      ),
    }));
  }, [token, members]);

  const dropdownOpen = !!token && suggestions.length > 0;

  React.useEffect(() => setHighlight(0), [token?.kind, token?.query]);

  /** Recompute the active token from the live input value + caret. */
  function syncToken(text: string, caret: number) {
    setToken(activeToken(text, caret));
  }

  /** Replace the active token's text with the picked completion + a trailing space. */
  function applyCompletion(start: number, completion: string) {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? raw.length;
    const before = raw.slice(0, start);
    const after = raw.slice(caret);
    const next = `${before}${completion} ${after}`;
    setRaw(next);
    setToken(null);
    // Restore the caret just past the inserted token on the next frame.
    requestAnimationFrame(() => {
      const pos = before.length + completion.length + 1;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  /** Commit the highlighted suggestion (member → `@name `, priority → `!label `). */
  function choose(index: number) {
    if (!token) return;
    const pick = suggestions[index];
    if (!pick) return;
    if (token.kind === "assignee") {
      const member = members.find((m) => m.userId === pick.id);
      if (!member) return;
      applyCompletion(token.start, `@${memberToken(member.userName)}`);
    } else {
      applyCompletion(token.start, `!${pick.id}`);
    }
  }

  const canSubmit = parsed.title.length > 0 && !createTask.isPending;

  const submit = React.useCallback(() => {
    if (!parsed.title || createTask.isPending) return;
    createTask.mutate(
      {
        title: parsed.title,
        status: defaultStatus,
        milestoneId: defaultMilestoneId,
        priority: parsed.priority,
        assigneeIds: parsed.assignees.map((a) => a.userId),
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
    setToken(null);
    inputRef.current?.focus();
  }, [parsed, due, createTask, defaultStatus, defaultMilestoneId]);

  return (
    <div
      className={cn(
        "relative flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/40",
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
        placeholder="Add a task…  !priority  @assignee"
        role="combobox"
        aria-expanded={dropdownOpen}
        aria-autocomplete="list"
        aria-controls="quick-add-suggestions"
        aria-activedescendant={
          dropdownOpen ? `quick-add-option-${highlight}` : undefined
        }
        onChange={(e) => {
          setRaw(e.target.value);
          syncToken(e.target.value, e.target.selectionStart ?? 0);
        }}
        onClick={(e) =>
          syncToken(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
        }
        onKeyUp={(e) => {
          // Arrow keys / Home / End move the caret — re-detect the token.
          if (
            e.key === "ArrowLeft" ||
            e.key === "ArrowRight" ||
            e.key === "Home" ||
            e.key === "End"
          ) {
            syncToken(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
          }
        }}
        onBlur={() => setToken(null)}
        onKeyDown={(e) => {
          if (dropdownOpen) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => (h + 1) % suggestions.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight(
                (h) => (h - 1 + suggestions.length) % suggestions.length,
              );
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              choose(highlight);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setToken(null);
              return;
            }
          }
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setRaw("");
            setDue(null);
            setToken(null);
          }
        }}
        className="h-9 min-w-40 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />

      {/* @/! autocomplete dropdown — anchored under the input. */}
      {dropdownOpen && (
        <ul
          id="quick-add-suggestions"
          role="listbox"
          aria-label={
            token?.kind === "assignee" ? "Assign a teammate" : "Set a priority"
          }
          className="absolute top-full left-0 z-30 mt-1 max-h-56 w-64 overflow-auto rounded-lg border bg-popover p-1 shadow-md"
        >
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                id={`quick-add-option-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(i);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150",
                  i === highlight ? "bg-accent/15 text-foreground" : "",
                )}
              >
                {s.node}
              </button>
            </li>
          ))}
        </ul>
      )}

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
        {parsed.assignees.length > 0 && (
          <span
            className="inline-flex items-center"
            title={`Assignees: ${parsed.assignees
              .map((a) => a.userName)
              .join(", ")}`}
          >
            <AssigneeStack
              assignees={parsed.assignees.map((a) => ({
                userId: a.userId,
                name: a.userName,
              }))}
              size="sm"
              max={3}
            />
          </span>
        )}
        {parsed.unknownAssignees.length > 0 && (
          <span className="text-xs text-muted-foreground">
            @{parsed.unknownAssignees[0]}?
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
