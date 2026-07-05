"use client";

import * as React from "react";
import type {
  AccessLevel,
  MeResponse,
  ModuleKey,
  PermissionMap,
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
