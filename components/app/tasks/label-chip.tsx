import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { LABEL_COLORS } from "@/lib/constants/project-options";
import type { ProjectLabel, ProjectLabelColor } from "@/lib/api/types";

export interface LabelChipProps extends React.ComponentProps<"span"> {
  /** Either pass a full label DTO… */
  label?: ProjectLabel;
  /** …or the raw name + colour (e.g. previewing a not-yet-created label). */
  name?: string;
  color?: ProjectLabelColor;
  /** Show a removable ✕ affordance; fires `onRemove` on click. */
  onRemove?: () => void;
}

/**
 * The one label pill used everywhere (spec §6.3). A `bg-<token>/12 text-<token>`
 * rounded chip whose colour comes from the shared `LABEL_COLORS` map, so the
 * sheet, cards, list, table and label editor render labels identically. When
 * `onRemove` is set it grows a ✕ button with a 44px-tall hit area.
 */
export function LabelChip({
  label,
  name,
  color,
  onRemove,
  className,
  ...props
}: LabelChipProps) {
  const resolvedName = label?.name ?? name ?? "";
  const resolvedColor: ProjectLabelColor = label?.color ?? color ?? "slate";
  const meta = LABEL_COLORS[resolvedColor] ?? LABEL_COLORS.slate;

  return (
    <span
      data-slot="label-chip"
      data-color={resolvedColor}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.chip,
        className,
      )}
      {...props}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      <span className="truncate">{resolvedName}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${resolvedName}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="relative -mr-0.5 grid size-3.5 place-items-center rounded-sm opacity-70 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none after:absolute after:inset-[-12px] after:content-['']"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
