"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Flag, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  StatusSelect,
  PrioritySelect,
  AssigneeAvatar,
  EstimateInput,
  LabelMultiSelect,
} from "@/components/app/tasks";
import { DatePickerPresets } from "@/components/fields/date-picker/date-picker-presets";
import { DatePickerTextInput } from "@/components/fields/date-picker/date-picker-text-input";
import {
  DEFAULT_PRESETS,
  startOfDay,
} from "@/components/fields/date-picker/date-picker.utils";
import type {
  ProjectMilestone,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* A property row: a fixed-width muted label + an inline-editable value */
/* control (spec §6.7). Labels read `text-xs font-medium muted`.        */
/* ------------------------------------------------------------------ */

function PropertyRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-3">
      <label
        htmlFor={htmlFor}
        className="pt-1.5 text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline date control — a non-RHF sibling of DatePickerField v2 reusing */
/* its presets sidebar, natural-language input and Evergreen Calendar.   */
/* ------------------------------------------------------------------ */

interface InlineDateProps {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  /** Earliest selectable date (inclusive). */
  fromDate?: Date;
}

function InlineDate({
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled,
  fromDate,
}: InlineDateProps) {
  const [open, setOpen] = React.useState(false);
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const [previewMonth, setPreviewMonth] = React.useState<Date | undefined>(
    undefined,
  );

  React.useEffect(() => {
    if (!open) setPreviewMonth(undefined);
  }, [open]);

  const parsed = value ? new Date(value) : undefined;
  const valid =
    parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;

  function commit(d: Date | undefined, close = true) {
    onChange(d ? format(d, "yyyy-MM-dd") : null);
    if (close) setOpen(false);
  }

  const isDayDisabled = (date: Date) =>
    fromDate ? startOfDay(date) < startOfDay(fromDate) : false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-8 w-full justify-start font-normal",
            !valid && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 size-3.5 shrink-0" />
          <span className="truncate tabular-nums">
            {valid ? format(valid, "d MMM yyyy") : placeholder}
          </span>
          {valid && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label={`Clear ${ariaLabel}`}
              className="ml-auto grid size-5 shrink-0 place-items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commit(undefined, false);
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        className="w-[min(520px,90vw)] overflow-hidden p-0"
      >
        <div className="flex flex-col sm:flex-row">
          <DatePickerPresets
            className="hidden sm:flex"
            presets={DEFAULT_PRESETS}
            today={today}
            selected={valid}
            fromDate={fromDate}
            variant="sidebar"
            onSelect={(d) => commit(d ?? undefined)}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <DatePickerPresets
              className="flex sm:hidden"
              presets={DEFAULT_PRESETS}
              today={today}
              selected={valid}
              fromDate={fromDate}
              variant="chips"
              onSelect={(d) => commit(d ?? undefined)}
            />
            <div className="border-b p-3">
              <DatePickerTextInput
                today={today}
                fromDate={fromDate}
                onPreview={(d) => setPreviewMonth(d ?? undefined)}
                onCommit={(d) => commit(d ?? undefined)}
              />
            </div>
            <Calendar
              mode="single"
              className="p-3"
              selected={valid}
              month={previewMonth}
              defaultMonth={previewMonth ?? valid ?? today}
              onMonthChange={setPreviewMonth}
              onSelect={(d) => commit(d ?? undefined)}
              disabled={isDayDisabled}
              modifiers={{ today }}
              classNames={{
                today:
                  "rounded-md bg-transparent font-semibold text-foreground ring-1 ring-inset ring-accent data-[selected=true]:ring-2",
              }}
              autoFocus
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Assignee combobox — searchable people picker showing avatars, backed  */
/* by the team list. "" / null = Unassigned.                             */
/* ------------------------------------------------------------------ */

export interface AssigneeOption {
  id: string;
  name: string;
}

function AssigneeCombobox({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string | null;
  options: AssigneeOption[];
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Assignee"
          disabled={disabled}
          className="h-8 w-full justify-between gap-2 font-normal"
        >
          <AssigneeAvatar name={selected?.name ?? null} showName />
          {selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear assignee"
              className="grid size-5 shrink-0 place-items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-56 p-0"
      >
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No matching people.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.name}
                  onSelect={() => {
                    onChange(o.id === value ? null : o.id);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === o.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <AssigneeAvatar name={o.name} showName />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Milestone combobox — pick the milestone the task is filed under.      */
/* ------------------------------------------------------------------ */

function MilestoneCombobox({
  value,
  milestones,
  onChange,
  disabled,
}: {
  value: string | null;
  milestones: ProjectMilestone[];
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = milestones.find((m) => m.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Milestone"
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-between gap-2 font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Flag className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selected ? selected.title : "No milestone"}
            </span>
          </span>
          {selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear milestone"
              className="grid size-5 shrink-0 place-items-center rounded-sm opacity-60 transition-opacity hover:opacity-100"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-56 p-0"
      >
        <Command>
          <CommandInput placeholder="Search milestones…" />
          <CommandList>
            <CommandEmpty>No milestones yet.</CommandEmpty>
            <CommandGroup>
              {milestones.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.title}
                  onSelect={() => {
                    onChange(m.id === value ? null : m.id);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === m.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{m.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Properties block                                                     */
/* ------------------------------------------------------------------ */

export interface TaskPropertiesProps {
  projectId: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assigneeId: string | null;
  assigneeOptions: AssigneeOption[];
  startDate: string | null;
  dueDate: string | null;
  estimateMinutes: number | null;
  milestoneId: string | null;
  milestones: ProjectMilestone[];
  /** Selected label ids (controlled). */
  labelIds: string[];
  disabled?: boolean;
  onStatusChange: (status: ProjectTaskStatus) => void;
  onPriorityChange: (priority: ProjectTaskPriority) => void;
  onAssigneeChange: (id: string | null) => void;
  onStartDateChange: (iso: string | null) => void;
  onDueDateChange: (iso: string | null) => void;
  onEstimateChange: (minutes: number | null) => void;
  onMilestoneChange: (id: string | null) => void;
  onLabelsChange: (labelIds: string[]) => void;
}

/**
 * The inline-editable properties block (spec §4.1) — a stack of labelled rows
 * for Status, Priority, Assignee, Start + Due dates, Estimate, Milestone and
 * Labels. Every control is one of the shared task atoms (or a sibling of the v2
 * date picker) so the sheet reads identically to the board/list/table. Each
 * edit fires an optimistic mutation through the parent.
 */
export function TaskProperties({
  projectId,
  status,
  priority,
  assigneeId,
  assigneeOptions,
  startDate,
  dueDate,
  estimateMinutes,
  milestoneId,
  milestones,
  labelIds,
  disabled,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onStartDateChange,
  onDueDateChange,
  onEstimateChange,
  onMilestoneChange,
  onLabelsChange,
}: TaskPropertiesProps) {
  // Due cannot precede start; start cannot follow due (soft inline guard).
  const startBound = startDate ? new Date(startDate) : undefined;

  return (
    <div className="space-y-3">
      <PropertyRow label="Status">
        <StatusSelect
          value={status}
          onChange={onStatusChange}
          disabled={disabled}
        />
      </PropertyRow>

      <PropertyRow label="Priority">
        <PrioritySelect
          value={priority}
          onChange={onPriorityChange}
          disabled={disabled}
        />
      </PropertyRow>

      <PropertyRow label="Assignee">
        <AssigneeCombobox
          value={assigneeId}
          options={assigneeOptions}
          onChange={onAssigneeChange}
          disabled={disabled}
        />
      </PropertyRow>

      <PropertyRow label="Start date">
        <InlineDate
          value={startDate}
          onChange={onStartDateChange}
          placeholder="No start date"
          ariaLabel="Start date"
          disabled={disabled}
        />
      </PropertyRow>

      <PropertyRow label="Due date">
        <InlineDate
          value={dueDate}
          onChange={onDueDateChange}
          placeholder="No due date"
          ariaLabel="Due date"
          disabled={disabled}
          fromDate={startBound}
        />
      </PropertyRow>

      <PropertyRow label="Estimate">
        <EstimateInput
          value={estimateMinutes}
          onChange={onEstimateChange}
          disabled={disabled}
        />
      </PropertyRow>

      <PropertyRow label="Milestone">
        <MilestoneCombobox
          value={milestoneId}
          milestones={milestones}
          onChange={onMilestoneChange}
          disabled={disabled}
        />
      </PropertyRow>

      <PropertyRow label="Labels">
        <LabelMultiSelect
          projectId={projectId}
          value={labelIds}
          onChange={onLabelsChange}
          disabled={disabled}
        />
      </PropertyRow>
    </div>
  );
}
