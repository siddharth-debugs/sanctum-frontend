import type { AccessLevel, ModuleKey, PermissionMap } from "@/lib/api/types";

/** Ordered module catalog (mirrors the backend lib/permissions.ts). */
export const MODULES: ModuleKey[] = [
  "dashboard",
  "clients",
  "projects",
  "team",
  "attendance",
  "calendar",
  "messages",
  "documents",
  "sheets",
  "ai",
  "finance",
  "settings",
];

export const ACCESS_LEVELS: AccessLevel[] = ["none", "view", "manage"];

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, manage: 2 };

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  projects: "Projects",
  team: "Team",
  attendance: "Attendance",
  calendar: "Calendar",
  messages: "Messages",
  documents: "Documents",
  sheets: "Sheets",
  ai: "AI Assistant",
  finance: "Finance",
  settings: "Settings",
};

/** Short description of what each module covers — shown in the permission editor. */
export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  dashboard: "Agency overview and metrics",
  clients: "Client directory, CRM, and portals",
  projects: "Projects, tasks, and time tracking",
  team: "Members, roles, and utilization",
  attendance: "Check-in/out, leaves, and holidays",
  calendar: "Content calendar and scheduling",
  messages: "Internal threads and chat",
  documents: "Document hub and uploads",
  sheets: "Spreadsheets",
  ai: "AI document & content generation",
  finance: "Invoices, expenses, and reports",
  settings: "Agency branding and settings",
};

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  none: "No access",
  view: "View",
  manage: "Manage",
};

/** A permission map granting `manage` on every module (the owner default). */
export function fullAccess(): PermissionMap {
  return MODULES.reduce((acc, m) => {
    acc[m] = "manage";
    return acc;
  }, {} as PermissionMap);
}

/** `true` when `have` satisfies `required`. */
export function meetsLevel(have: AccessLevel, required: AccessLevel): boolean {
  return RANK[have ?? "none"] >= RANK[required];
}

/** Can the holder of `perms` at least VIEW the module (i.e. it's not hidden)? */
export function canView(
  perms: PermissionMap | undefined,
  module: ModuleKey,
): boolean {
  if (!perms) return true; // permissions not loaded yet → don't flicker-hide
  return meetsLevel(perms[module] ?? "none", "view");
}

/** Can the holder of `perms` MANAGE (write to) the module? */
export function canManage(
  perms: PermissionMap | undefined,
  module: ModuleKey,
): boolean {
  if (!perms) return false;
  return meetsLevel(perms[module] ?? "none", "manage");
}

/**
 * Map a pathname to the module that owns it (longest matching route base).
 * Returns null for routes outside the gated catalog (e.g. /portal, /pickertest).
 */
const ROUTE_MODULES: Array<{ base: string; module: ModuleKey }> = [
  { base: "/dashboard", module: "dashboard" },
  { base: "/clients", module: "clients" },
  { base: "/projects", module: "projects" },
  { base: "/team", module: "team" },
  { base: "/attendance", module: "attendance" },
  { base: "/calendar", module: "calendar" },
  { base: "/messages", module: "messages" },
  { base: "/documents", module: "documents" },
  { base: "/sheets", module: "sheets" },
  { base: "/ai", module: "ai" },
  { base: "/finance", module: "finance" },
  { base: "/settings", module: "settings" },
];

export function moduleForPath(pathname: string): ModuleKey | null {
  const match = ROUTE_MODULES.filter(
    (r) => pathname === r.base || pathname.startsWith(r.base + "/"),
  ).sort((a, b) => b.base.length - a.base.length)[0];
  return match?.module ?? null;
}

/** First module the user can at least view — used as a safe landing route. */
export function firstAccessibleModule(
  perms: PermissionMap | undefined,
): ModuleKey | null {
  if (!perms) return "dashboard";
  return MODULES.find((m) => canView(perms, m)) ?? null;
}
