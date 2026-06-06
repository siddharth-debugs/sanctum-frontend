import type { SelectOption } from "@/components/fields";
import type { Role } from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Team roles — Evergreen pills: Owner = primary (pine), Admin = accent */
/* (brass), Member = muted. Owner is never assignable via invite/edit.  */
/* ------------------------------------------------------------------ */

/** Roles a teammate can be invited as / changed to (Owner is implicit). */
export const ROLE_OPTIONS: SelectOption[] = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
];

/** Role filter options for the directory (includes Owner + an "All" sentinel). */
export const ROLE_FILTER_OPTIONS: SelectOption[] = [
  { label: "Owner", value: "owner" },
  { label: "Admin", value: "admin" },
  { label: "Member", value: "member" },
];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

/** Evergreen badge classes per role (token color-mix tints, never purple). */
export const ROLE_BADGE_CLASS: Record<Role, string> = {
  owner:
    "text-primary bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]",
  admin:
    "text-accent bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]",
  member:
    "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)]",
};

/**
 * Format a duration given in MINUTES as a compact "12h" / "12h 30m" / "45m"
 * string. Returns "0m" for nullish / zero input.
 */
export function fmtHours(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0 || Number.isNaN(minutes)) return "0m";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
