"use client";

import * as React from "react";
import { Check, Plus, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  useProjectLabels,
  useCreateProjectLabel,
} from "@/hooks/use-task-labels";
import {
  LABEL_COLORS,
  LABEL_COLOR_VALUES,
} from "@/lib/constants/project-options";
import { LabelChip } from "./label-chip";
import type { ProjectLabel, ProjectLabelColor } from "@/lib/api/types";

export interface LabelMultiSelectProps {
  projectId: string;
  /** Currently-selected label ids (controlled). */
  value: string[];
  /** Fires with the next selected id set whenever the selection changes. */
  onChange: (labelIds: string[]) => void;
  disabled?: boolean;
  /** Trigger size — "sm" (h-8) or "default" (h-9). */
  size?: "sm" | "default";
  className?: string;
}

/** Pick the next colour round-robin so freshly-created labels vary. */
function nextColor(existing: ProjectLabel[]): ProjectLabelColor {
  return LABEL_COLOR_VALUES[existing.length % LABEL_COLOR_VALUES.length];
}

/**
 * Searchable label multi-select with create-inline (spec §4.2). Reads the
 * project's labels via `useProjectLabels`, toggles membership, and offers a
 * "Create <query>" row that POSTs a new label (round-robin colour) through
 * `useCreateProjectLabel` then selects it. The trigger shows the chosen
 * `LabelChip`s; the same component backs the sheet's Labels row and the
 * filter/quick-add surfaces. Loading + empty states are explicit.
 */
export function LabelMultiSelect({
  projectId,
  value,
  onChange,
  disabled,
  size = "sm",
  className,
}: LabelMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const { data: labels = [], isLoading } = useProjectLabels(projectId);
  const createLabel = useCreateProjectLabel(projectId);

  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const selectedLabels = React.useMemo(
    () => labels.filter((l) => selectedSet.has(l.id)),
    [labels, selectedSet],
  );

  const trimmed = query.trim();
  const exactExists = labels.some(
    (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
  );

  function toggle(id: string) {
    onChange(
      selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  }

  async function createAndSelect() {
    if (!trimmed || createLabel.isPending) return;
    const created = await createLabel.mutateAsync({
      name: trimmed,
      color: nextColor(labels),
    });
    onChange([...value, created.id]);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Labels"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-1.5 font-normal",
            size === "sm" ? "h-8" : "h-9",
            selectedLabels.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <Tag className="size-3.5 shrink-0 text-muted-foreground" />
          {selectedLabels.length === 0 ? (
            <span>Add labels</span>
          ) : (
            <span className="flex flex-1 flex-wrap items-center gap-1.5 overflow-hidden">
              {selectedLabels.map((l) => (
                <LabelChip key={l.id} label={l} />
              ))}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-56 p-0"
        align="start"
      >
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput
            placeholder="Search or create label…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="space-y-1 p-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-7 animate-pulse rounded bg-muted/60"
                  />
                ))}
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {trimmed
                    ? "Press create to add it."
                    : "No labels yet."}
                </CommandEmpty>
                <CommandGroup>
                  {labels.map((l) => {
                    const meta = LABEL_COLORS[l.color] ?? LABEL_COLORS.slate;
                    const checked = selectedSet.has(l.id);
                    return (
                      <CommandItem
                        key={l.id}
                        value={l.name}
                        onSelect={() => toggle(l.id)}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            checked ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="truncate">{l.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                {trimmed && !exactExists && (
                  <CommandGroup>
                    <CommandItem
                      value={`__create__${trimmed}`}
                      onSelect={createAndSelect}
                      disabled={createLabel.isPending}
                    >
                      <Plus className="size-4" />
                      <span className="truncate">
                        Create &ldquo;{trimmed}&rdquo;
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
