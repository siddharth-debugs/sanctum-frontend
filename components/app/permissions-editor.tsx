"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  UsersRound,
  CalendarClock,
  CalendarDays,
  MessagesSquare,
  Files,
  Sheet,
  Sparkles,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  MODULES,
  ACCESS_LEVELS,
  MODULE_LABELS,
  MODULE_DESCRIPTIONS,
  ACCESS_LABELS,
} from "@/lib/permissions";
import type { AccessLevel, ModuleKey, PermissionMap } from "@/lib/api/types";

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  clients: Users,
  projects: FolderKanban,
  team: UsersRound,
  attendance: CalendarClock,
  calendar: CalendarDays,
  messages: MessagesSquare,
  documents: Files,
  sheets: Sheet,
  ai: Sparkles,
  finance: TrendingUp,
  settings: Settings,
};

/** Active-pill classes per level (Evergreen tints; never colour-only). */
export const LEVEL_ACTIVE: Record<AccessLevel, string> = {
  none: "bg-[color-mix(in_srgb,var(--muted-foreground)_18%,transparent)] text-foreground",
  view: "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-accent",
  manage:
    "[background-image:linear-gradient(180deg,var(--primary),color-mix(in_srgb,var(--primary)_85%,#000))] text-primary-foreground",
};

/** A 3-way None / View / Manage segmented control. Reused in the role matrix. */
export function AccessLevelSegmented({
  value,
  onChange,
  disabled,
}: {
  value: AccessLevel;
  onChange: (level: AccessLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      className="inline-grid grid-cols-3 gap-0.5 rounded-lg border bg-[color-mix(in_srgb,var(--card)_60%,transparent)] p-0.5"
    >
      {ACCESS_LEVELS.map((level) => {
        const active = value === level;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(level)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? LEVEL_ACTIVE[level]
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {ACCESS_LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Per-module access-level editor. Controlled: owns nothing, renders `value` and
 * emits the full next map on every change. Owner accounts are always full
 * access, so callers should render this read-only (disabled) for owners.
 */
export function PermissionsEditor({
  value,
  onChange,
  disabled,
}: {
  value: PermissionMap;
  onChange: (next: PermissionMap) => void;
  disabled?: boolean;
}) {
  const setAll = (level: AccessLevel) => {
    const next = { ...value };
    for (const m of MODULES) next[m] = level;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Choose what this member can access across the app. Changes apply on
          their next request.
        </p>
        {!disabled && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Set all:</span>
            <button
              type="button"
              onClick={() => setAll("none")}
              className="rounded-md border px-2 py-1 font-medium hover:bg-muted"
            >
              None
            </button>
            <button
              type="button"
              onClick={() => setAll("view")}
              className="rounded-md border px-2 py-1 font-medium hover:bg-muted"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => setAll("manage")}
              className="rounded-md border px-2 py-1 font-medium hover:bg-muted"
            >
              Manage
            </button>
          </div>
        )}
      </div>

      <ul className="divide-y rounded-xl border">
        {MODULES.map((m) => {
          const Icon = MODULE_ICONS[m];
          return (
            <li
              key={m}
              className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {MODULE_LABELS[m]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {MODULE_DESCRIPTIONS[m]}
                  </p>
                </div>
              </div>
              <AccessLevelSegmented
                value={value[m]}
                onChange={(level) => onChange({ ...value, [m]: level })}
                disabled={disabled}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
