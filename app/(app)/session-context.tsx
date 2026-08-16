"use client";

import * as React from "react";
import type {
  AccessLevel,
  MeResponse,
  ModuleKey,
  PermissionMap,
  Persona,
} from "@/lib/api/types";
import { canManage, canView, fullAccess, meetsLevel } from "@/lib/permissions";
import { useThemeVariant } from "@/theme/theme-provider";
import { THEME_REGISTRY } from "@/theme/registry";
import type { ThemeName } from "@/theme/types";

const SessionContext = React.createContext<MeResponse | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: MeResponse;
  children: React.ReactNode;
}) {
  // Apply the agency-wide theme preset (set by an admin in Settings) so every
  // member sees the agency's chosen look. Falls back to the default silently.
  const { setVariant } = useThemeVariant();
  const preset = value.agency?.themePreset;
  React.useEffect(() => {
    if (preset && Object.prototype.hasOwnProperty.call(THEME_REGISTRY, preset)) {
      setVariant(preset as ThemeName);
    }
  }, [preset, setVariant]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

/** Read the authenticated session. Must be used inside the (app) layout. */
export function useSession(): MeResponse {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within the app SessionProvider");
  }
  return ctx;
}

/** The signed-in user's effective module permissions (owner ⇒ full access). */
export function usePermissions(): PermissionMap {
  const session = useSession();
  return session.permissions ?? fullAccess();
}

/** The signed-in user's persona (owner|admin|manager|employee|client). */
export function usePersona(): Persona {
  const session = useSession();
  return session.persona ?? session.user.persona ?? "employee";
}

/** True when the signed-in user is a client (portal) account. */
export function useIsClient(): boolean {
  return useSession().user.role === "client";
}

/** True when the signed-in user is the agency owner (strict financials & pricing access). */
export function useIsOwner(): boolean {
  return useSession().user.role === "owner";
}

/** True when the caller can act on `targetRole` (owner acts on all; a
 * non-owner only on strictly-lower tiers). Mirrors the backend rank ceiling. */
export function canManageTargetRole(callerRole: string, targetRole: string): boolean {
  const rank: Record<string, number> = { client: 0, member: 1, admin: 2, owner: 3 };
  if (callerRole === "owner") return true;
  if (callerRole === "client") return false;
  return (rank[targetRole] ?? 0) < (rank[callerRole] ?? 0);
}

/**
 * Permission helpers bound to the current session.
 *   can("finance")            → at least view access
 *   can("finance", "manage")  → write access
 */
export function useCan() {
  const perms = usePermissions();
  return React.useMemo(
    () => ({
      permissions: perms,
      can: (module: ModuleKey, level: AccessLevel = "view") =>
        meetsLevel(perms[module] ?? "none", level),
      canView: (module: ModuleKey) => canView(perms, module),
      canManage: (module: ModuleKey) => canManage(perms, module),
    }),
    [perms],
  );
}
