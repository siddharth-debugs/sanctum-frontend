"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Sun, Moon, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { GlassCard } from "@/components/app/glass-card";
import { UsageLimits } from "@/components/app/usage-limits";
import { RolePermissionsMatrix } from "@/components/app/role-permissions-matrix";
import { CustomRolesManager } from "@/components/app/custom-roles-manager";
import { AttendanceSettings } from "@/components/app/attendance-settings";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TextField } from "@/components/fields";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession, useCan } from "../session-context";
import { useUpdateAgency } from "@/hooks/use-agency";
import { useChangePassword } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(8, "At least 8 characters"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Change-password card (General tab). Maps a 400 to the current-password field. */
function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (v: ChangePasswordValues) => {
    changePassword.mutate(
      { currentPassword: v.currentPassword, newPassword: v.newPassword },
      {
        onSuccess: () => {
          toast.success("Password updated");
          form.reset();
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 400) {
            form.setError("currentPassword", {
              message: "Your current password is incorrect",
            });
            return;
          }
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't update password",
          );
        },
      },
    );
  };

  return (
    <GlassCard className="p-6">
      <h2 className="font-display text-lg font-semibold">Change password</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Use at least 8 characters. You&apos;ll stay signed in on this device.
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-w-md space-y-4"
        >
          <TextField
            control={form.control}
            name="currentPassword"
            label="Current password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <TextField
            control={form.control}
            name="newPassword"
            label="New password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <TextField
            control={form.control}
            name="confirmPassword"
            label="Confirm new password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={changePassword.isPending}>
              <KeyRound className="size-4" />
              {changePassword.isPending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </Form>
    </GlassCard>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const session = useSession();
  const { canManage } = useCan();
  const updateAgency = useUpdateAgency();
  const [name, setName] = React.useState(session.agency?.name ?? "");
  const [brandColor, setBrandColor] = React.useState(
    session.agency?.brandColor ?? "#1F8FD6",
  );

  const isPrivileged =
    session.user.role === "owner" || session.user.role === "admin";
  const canEditAgency = isPrivileged && canManage("settings");

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
        description="Manage your agency profile, roles & permissions, and the look of your workspace."
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          {isPrivileged && (
            <TabsTrigger value="roles">Roles &amp; Permissions</TabsTrigger>
          )}
          {isPrivileged && (
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="mt-5 space-y-6">
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

      <ChangePasswordCard />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Usage &amp; limits</h2>
        <UsageLimits />
      </section>

      <GlassCard className="p-6">
        <h2 className="font-display text-lg font-semibold">Theme</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          A single editorial evergreen theme with light and dark modes. Switching
          mode changes only design tokens — never the app.
        </p>

        <div className="flex items-center gap-3">
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
        </TabsContent>

        {isPrivileged && (
          <TabsContent value="roles" className="mt-5 space-y-8">
            <RolePermissionsMatrix canEdit={canEditAgency} />
            <div className="border-t pt-6">
              <CustomRolesManager canEdit={canEditAgency} />
            </div>
          </TabsContent>
        )}

        {isPrivileged && (
          <TabsContent value="attendance" className="mt-5">
            <AttendanceSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
