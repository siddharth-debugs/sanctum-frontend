"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
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
import { StatusBadge } from "./status-badge";
import { PriorityIcon } from "./priority-icon";
import type { ProjectTask } from "@/lib/api/types";

export interface TaskPickerPopoverProps {
  /** Candidate tasks to choose from (caller pre-filters out self / cycles). */
  tasks: ProjectTask[];
  /** Fires with the chosen task once selected; popover then closes. */
  onSelect: (task: ProjectTask) => void;
  /** The clickable trigger (e.g. an "Add dependency" / "Set parent" button). */
  children: React.ReactNode;
  /** ids to render as already-linked (shown disabled with a hint). */
  disabledIds?: string[];
  isLoading?: boolean;
  placeholder?: string;
  emptyText?: string;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Searchable task picker (spec §4.2) used wherever one task references another —
 * the sheet's dependency "Blocked by / Blocks" adders and the parent-task setter.
 * Pure: the caller supplies the candidate `tasks` (already filtered to avoid
 * self-links and cycles) and handles the resulting `onSelect`. Each row shows a
 * status dot + priority glyph so tasks are identifiable at a glance; already
 * linked rows are disabled. Loading + empty states are explicit.
 */
export function TaskPickerPopover({
  tasks,
  onSelect,
  children,
  disabledIds,
  isLoading = false,
  placeholder = "Search tasks…",
  emptyText = "No tasks found.",
  align = "start",
  open: openProp,
  onOpenChange,
  className,
}: TaskPickerPopoverProps) {
  const [openState, setOpenState] = React.useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;

  const disabledSet = React.useMemo(
    () => new Set(disabledIds ?? []),
    [disabledIds],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className={cn("w-72 p-0", className)}
        align={align}
      >
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={placeholder} />
          <CommandList>
            {isLoading ? (
              <div className="space-y-1 p-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded bg-muted/60"
                  />
                ))}
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {tasks.map((t) => {
                    const isDisabled = disabledSet.has(t.id);
                    return (
                      <CommandItem
                        key={t.id}
                        value={`${t.title} ${t.id}`}
                        disabled={isDisabled}
                        onSelect={() => {
                          if (isDisabled) return;
                          onSelect(t);
                          setOpen(false);
                        }}
                        className="gap-2"
                      >
                        <StatusBadge status={t.status} dotOnly />
                        <PriorityIcon priority={t.priority} hideLabel />
                        <span className="flex-1 truncate">{t.title}</span>
                        {isDisabled && (
                          <span className="text-xs text-muted-foreground">
                            Linked
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
