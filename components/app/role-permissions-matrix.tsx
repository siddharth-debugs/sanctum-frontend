"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldCheck, Lock, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/app/glass-card";
import { AccessLevelSegmented } from "@/components/app/permissions-editor";
import { useRolePermissions, useUpdateRolePermissions } from "@/hooks/use-roles";
import { MODULE_LABELS, MODULE_DESCRIPTIONS, MODULES } from "@/lib/permissions";
import { ApiError } from "@/lib/api/client";
import type {
  AccessLevel,
  ModuleInfo,
  ModuleKey,
  PermissionMap,
} from "@/lib/api/types";

/** Editable role columns (owner is always full-access and locked). */
const EDIT_ROLES = ["admin", "member"] as const;
type EditRole = (typeof EDIT_ROLES)[number];

const ROLE_LABEL: Record<"owner" | EditRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const fullMap = (): PermissionMap =>
  MODULES.reduce((acc, m) => {
    acc[m] = "manage";
    return acc;
  }, {} as PermissionMap);

export function RolePermissionsMatrix({
  canEdit = true,
}: {
  canEdit?: boolean;
}) {
  const { data, isLoading, error } = useRolePermissions();
  const update = useUpdateRolePermissions();

  const [draft, setDraft] = React.useState<Record<EditRole, PermissionMap>>({
    admin: fullMap(),
    member: fullMap(),
  });

  // Sync local draft whenever the server data (re)loads.
  React.useEffect(() => {
    if (data) {
      setDraft({ admin: data.roles.admin, member: data.roles.member });
    }
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error || !data) {
    return (
      <GlassCard className="p-8 text-center text-sm text-muted-foreground">
        Couldn&apos;t load roles &amp; permissions. Please retry.
      </GlassCard>
    );
  }

  // Use the server's module catalog so newly-added modules appear automatically.
  const modules: ModuleInfo[] =
    data.modules?.length > 0
      ? data.modules
      : MODULES.map((key) => ({
          key,
          label: MODULE_LABELS[key],
          description: MODULE_DESCRIPTIONS[key],
        }));

  const dirty =
    JSON.stringify({ admin: draft.admin, member: draft.member }) !==
    JSON.stringify({ admin: data.roles.admin, member: data.roles.member });

  const setCell = (role: EditRole, module: ModuleKey, level: AccessLevel) =>
    setDraft((d) => ({ ...d, [role]: { ...d[role], [module]: level } }));

  const setRoleAll = (role: EditRole, level: AccessLevel) =>
    setDraft((d) => ({
      ...d,
      [role]: modules.reduce(
        (acc, m) => ({ ...acc, [m.key]: level }),
        {} as PermissionMap,
      ),
    }));

  const reset = () =>
    setDraft({ admin: data.roles.admin, member: data.roles.member });

  const onSave = () => {
    update.mutate(
      { admin: draft.admin, member: draft.member },
      {
        onSuccess: () => toast.success("Role permissions saved"),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't save roles",
          ),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <div>
            <h3 className="font-display text-base font-semibold">
              Roles &amp; permissions
            </h3>
            <p className="text-sm text-muted-foreground">
              Default access per role for each module. Per-member overrides on
              the Team page take precedence.
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {dirty && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="size-3.5" /> Reset
              </Button>
            )}
            <Button onClick={onSave} disabled={!dirty || update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-[color-mix(in_srgb,var(--muted-foreground)_6%,transparent)]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Module
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {ROLE_LABEL.owner}
              </th>
              {EDIT_ROLES.map((r) => (
                <th
                  key={r}
                  className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
            {canEdit && (
              <tr className="border-b text-[11px] text-muted-foreground">
                <td className="px-4 py-1.5">Set all →</td>
                <td className="px-4 py-1.5 text-center">—</td>
                {EDIT_ROLES.map((r) => (
                  <td key={r} className="px-4 py-1.5">
                    <div className="flex justify-center gap-1">
                      {(["none", "view", "manage"] as AccessLevel[]).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setRoleAll(r, lvl)}
                          className="rounded border px-1.5 py-0.5 font-medium capitalize hover:bg-muted"
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.key} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.description}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1 rounded-md border bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-2.5 py-1 text-xs font-semibold text-primary">
                      <Lock className="size-3" /> Manage
                    </span>
                  </div>
                </td>
                {EDIT_ROLES.map((r) => (
                  <td key={r} className="px-4 py-3">
                    <div className="flex justify-center">
                      <AccessLevelSegmented
                        value={draft[r][m.key] ?? "manage"}
                        onChange={(lvl) => setCell(r, m.key, lvl)}
                        disabled={!canEdit}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
