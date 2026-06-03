"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Settings, Check, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { GlassCard } from "@/components/app/glass-card";
import { UsageLimits } from "@/components/app/usage-limits";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useThemeVariant } from "@/theme/theme-provider";
import { THEME_LIST } from "@/theme/registry";
import { useSession } from "../session-context";
import { useUpdateAgency } from "@/hooks/use-agency";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { variant, setVariant } = useThemeVariant();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const session = useSession();
  const updateAgency = useUpdateAgency();
  const [name, setName] = React.useState(session.agency?.name ?? "");
  const [brandColor, setBrandColor] = React.useState(
    session.agency?.brandColor ?? "#1F8FD6",
  );

  const canEditAgency =
    session.user.role === "owner" || session.user.role === "admin";

  const saveProfile = () => {
    updateAgency.mutate(
      { name, brandColor },
      {
        onSuccess: () => toast.success("Agency profile saved"),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't save profile",
          ),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <Settings className="size-3" /> Agency
          </>
        }
        title="Settings"
        description="Manage your agency profile and the look of your workspace and client portals."
      />

      <GlassCard className="p-6">
        <h2 className="font-display text-lg font-semibold">Agency profile</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Shown on client portals and welcome emails.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Agency name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEditAgency}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand color</Label>
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              disabled={!canEditAgency}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={saveProfile}
            disabled={!canEditAgency || updateAgency.isPending}
          >
            {updateAgency.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </GlassCard>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Usage &amp; limits</h2>
        <UsageLimits />
      </section>

      <GlassCard className="p-6">
        <h2 className="font-display text-lg font-semibold">Theme</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Six glassmorphism themes, each with light and dark. Bordeaux is the
          default. Switching a theme changes only design tokens — never the app.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_LIST.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => setVariant(t.name)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5",
                variant === t.name
                  ? "border-primary ring-2 ring-primary/15"
                  : "border-border",
              )}
            >
              <span
                className="size-11 shrink-0 rounded-lg"
                style={{ background: t.swatch }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold">
                  {t.label}
                  {variant === t.name && (
                    <Check className="size-3.5 text-primary" />
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.vibe}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-sm font-medium">Mode</span>
          <div className="flex gap-2">
            <Button
              variant={!isDark ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              <Sun className="size-4" /> Light
            </Button>
            <Button
              variant={isDark ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              <Moon className="size-4" /> Dark
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
