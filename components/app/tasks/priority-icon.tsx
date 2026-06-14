import * as React from "react";

import { cn } from "@/lib/utils";
import { PRIORITY_META } from "@/lib/constants/project-options";
import type { ProjectTaskPriority } from "@/lib/api/types";

export interface PriorityIconProps extends React.ComponentProps<"span"> {
  priority: ProjectTaskPriority;
  /** Square glyph size in px. Default 14 (dense rows / cards). */
  size?: number;
  /** Hide the visually-hidden text label (e.g. when paired with a text label). */
  hideLabel?: boolean;
}

/**
 * Semantic priority glyph (spec §6.2). Renders a three-bar signal whose filled
 * bars + colour encode rank — none (hollow, muted), low (1 bar), medium
 * (2 bars, primary), high (3 bars, warning) — and a filled flag for urgent
 * (destructive). Colour is never the ONLY signal: bar count / flag shape carry
 * the meaning too, and a visually-hidden label names the level for SR users.
 */
export function PriorityIcon({
  priority,
  size = 14,
  hideLabel = false,
  className,
  ...props
}: PriorityIconProps) {
  const meta = PRIORITY_META[priority];

  return (
    <span
      data-slot="priority-icon"
      data-priority={priority}
      aria-hidden={hideLabel ? undefined : false}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ color: meta.color }}
      {...props}
    >
      {meta.flag ? (
        <FlagGlyph size={size} />
      ) : (
        <BarsGlyph size={size} bars={meta.bars} />
      )}
      {!hideLabel && <span className="sr-only">{meta.label}</span>}
    </span>
  );
}

/** Three ascending bars; `bars` of them are filled, the rest are faint. */
function BarsGlyph({ size, bars }: { size: number; bars: 0 | 1 | 2 | 3 }) {
  // Heights ascend left→right; index 0 is the shortest bar.
  const heights = [5, 9, 13];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      role="presentation"
      className="[&>rect]:transition-opacity [&>rect]:duration-150"
    >
      {heights.map((h, i) => {
        const filled = i < bars;
        return (
          <rect
            key={i}
            x={2 + i * 4.5}
            y={14 - h}
            width={2.75}
            height={h}
            rx={1}
            fill="currentColor"
            opacity={filled ? 1 : 0.28}
          />
        );
      })}
    </svg>
  );
}

/** Filled pennant flag — urgent only. */
function FlagGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      role="presentation"
    >
      <path
        d="M4 2v12"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path
        d="M4 2.5h7.2c.7 0 1 .8.5 1.3L10 5.5l2.2 1.7c.5.4.2 1.3-.5 1.3H4z"
        fill="currentColor"
      />
    </svg>
  );
}
