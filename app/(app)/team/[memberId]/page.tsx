"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Mail,
  Phone,
  CalendarDays,
  Clock,
  FolderKanban,
  Wallet,
  Briefcase,
  Building2,
  Gauge,
  ListTodo,
  Plus,
  Activity,
  ShieldCheck,
  Lock,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { InviteMemberSheet } from "@/components/app/invite-member-sheet";
import { LogTimeDialog } from "@/components/app/log-time-dialog";
import { RoleBadge, UtilizationBar } from "@/components/app/team-bits";
import { ProjectStatusBadge, TaskStatusBadge } from "@/components/app/project-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamMember, useUpdateMember, useDeleteMember } from "@/hooks/use-team";
import { useDisclosure } from "@/hooks/use-disclosure";
import { initials, formatDate } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import { fmtHours } from "@/lib/constants/team-options";
import { ApiError } from "@/lib/api/client";
import { PermissionsEditor } from "@/components/app/permissions-editor";
import { MemberAttendancePanel } from "@/components/app/member-attendance";
import { fullAccess } from "@/lib/permissions";
import { useCustomRoles } from "@/hooks/use-roles";
import { useCan } from "../../session-context";
import type {
  PermissionMap,
  Role,
  TeamMemberDetail,
} from "@/lib/api/types";

/** A label/value row inside a card. */
function InfoRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 text-sm last:border-b-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/** Active / Disabled status pill (Evergreen: success / muted). */
function StatusBadge({ status }: { status: TeamMemberDetail["status"] }) {
  const active = status === "active";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold " +
        (active
          ? "text-success bg-[color-mix(in_srgb,var(--success)_16%,transparent)]"
          : "text-muted-foreground bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)]")
      }
    >
      <span className="size-1.5 rounded-full bg-current" />
      {active ? "Active" : "Disabled"}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="font-display text-base font-semibold">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Role + module-permission editor (owner/admin only; owner target locked). */
function AccessTab({ member }: { member: TeamMemberDetail }) {
  const { canManage } = useCan();
  const update = useUpdateMember(member.id);
  const { data: customRoles } = useCustomRoles(canManage("team"));

  const isOwnerTarget = member.role === "owner";
  // Only owner/admin with Team "manage" may edit (the API enforces this too).
  const editable = canManage("team") && !isOwnerTarget;

  const initialPerms = isOwnerTarget
    ? fullAccess()
    : (member.permissions ?? fullAccess());
  // roleKey is the built-in 'member'/'admin', or a custom role id.
  const initialRoleKey = member.customRoleId ?? member.role;

  const [roleKey, setRoleKey] = React.useState<string>(initialRoleKey);
  const [perms, setPerms] = React.useState<PermissionMap>(initialPerms);

  // Re-sync if the member data changes underneath us (e.g. after a save).
  React.useEffect(() => {
    setRoleKey(member.customRoleId ?? member.role);
    setPerms(isOwnerTarget ? fullAccess() : (member.permissions ?? fullAccess()));
  }, [member.permissions, member.role, member.customRoleId, isOwnerTarget]);

  const selectedCustom = (customRoles ?? []).find((r) => r.id === roleKey);
  // When a custom role is selected, permissions come from the role (read-only);
  // otherwise the grid edits this member's personal overrides.
  const editorValue = selectedCustom ? selectedCustom.permissions : perms;
  const editorDisabled = !editable || !!selectedCustom;

  const roleChanged = roleKey !== initialRoleKey;
  const permsChanged =
    !selectedCustom && JSON.stringify(perms) !== JSON.stringify(initialPerms);
  const dirty = roleChanged || permsChanged;

  const onSave = () => {
    const payload = selectedCustom
      ? { customRoleId: roleKey } // role drives; server clears personal overrides
      : {
          ...(roleChanged ? { role: roleKey as Role, customRoleId: null } : {}),
          permissions: perms,
        };
    update.mutate(payload, {
      onSuccess: () => toast.success("Access updated"),
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't update access",
        ),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Role &amp; permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        {isOwnerTarget ? (
          <div className="flex items-start gap-3 rounded-lg border bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
            <Lock className="mt-0.5 size-4 text-primary" />
            <div className="text-sm">
              <p className="font-semibold">The owner always has full access.</p>
              <p className="text-muted-foreground">
                The owner&apos;s role and permissions can&apos;t be changed.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:max-w-xs">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={roleKey}
              onValueChange={setRoleKey}
              disabled={!editable}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {(customRoles ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedCustom
                ? `Permissions come from the “${selectedCustom.name}” role (base: ${selectedCustom.baseRole}). Edit it in Settings → Roles & Permissions.`
                : "Admins manage clients, team, and settings. The grid below sets this member’s personal overrides on top of the role."}
            </p>
          </div>
        )}

        <PermissionsEditor
          value={editorValue}
          onChange={setPerms}
          disabled={editorDisabled}
        />

        {editable && (
          <div className="flex items-center justify-end gap-3 border-t pt-4">
            {dirty && (
              <span className="text-xs text-muted-foreground">
                Unsaved changes
              </span>
            )}
            <Button onClick={onSave} disabled={!dirty || update.isPending}>
              {update.isPending ? "Saving…" : "Save access"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = React.use(params);
  const router = useRouter();
  const { data: member, isLoading, error } = useTeamMember(memberId);
  const update = useUpdateMember(memberId);
  const del = useDeleteMember();

  const editSheet = useDisclosure();
  const logTimeDialog = useDisclosure();
  const deactivateDialog = useDisclosure();
  const deleteDialog = useDisclosure();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <Skeleton className="h-9 w-72" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[{ label: "Team", href: "/team" }, { label: "Member" }]}
          title="Member not found"
          description="This member may have been removed or you don't have access."
        />
        <Button asChild variant="outline">
          <Link href="/team">Back to team</Link>
        </Button>
      </div>
    );
  }

  const name = member.fullName ?? member.email;
  const pct = Math.round(member.utilizationPct ?? 0);
  const isOwner = member.role === "owner";
  const isActive = member.status === "active";

  const onToggleStatus = () => {
    update.mutate(
      { status: isActive ? "disabled" : "active" },
      {
        onSuccess: () => {
          toast.success(isActive ? "Member deactivated" : "Member reactivated");
          deactivateDialog.onClose();
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't update the member",
          ),
      },
    );
  };

  const onConfirmDelete = () => {
    del.mutate(member.id, {
      onSuccess: () => {
        toast.success(`${name} removed`);
        deleteDialog.onClose();
        router.push("/team");
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't remove the member",
        ),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Team", href: "/team" }, { label: name }]}
        title={
          <span className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback
                className="text-base font-bold text-primary-foreground"
                style={{
                  background: "linear-gradient(135deg,var(--primary),var(--accent))",
                }}
              >
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-wrap items-center gap-2.5">
              {name}
              <StatusBadge status={member.status} />
              <RoleBadge role={member.role} label={member.roleName} />
            </span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {member.designation && <span>{member.designation}</span>}
            {member.designation && member.department && (
              <span className="opacity-40">•</span>
            )}
            {member.department && <span>{member.department}</span>}
            {!member.designation && !member.department && (
              <span>{member.email}</span>
            )}
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => editSheet.onOpen()}>
              <Pencil className="size-4" /> Edit
            </Button>
            {!isOwner && (
              <>
                <Button
                  variant="outline"
                  onClick={() => deactivateDialog.onOpen()}
                >
                  {isActive ? "Deactivate" : "Reactivate"}
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteDialog.onOpen()}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </>
            )}
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="timelogs">Time Logs</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={<Mail className="size-3.5" />} label="Email">
                  <a
                    href={`mailto:${member.email}`}
                    className="text-primary hover:underline"
                  >
                    {member.email}
                  </a>
                </InfoRow>
                <InfoRow icon={<Phone className="size-3.5" />} label="Phone">
                  {member.phone || "—"}
                </InfoRow>
                <InfoRow icon={<CalendarDays className="size-3.5" />} label="Joined">
                  {member.joinedAt ? formatDate(member.joinedAt) : "—"}
                </InfoRow>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Work Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={<Gauge className="size-3.5" />} label="Weekly capacity">
                  {member.weeklyCapacityHrs}h
                </InfoRow>
                <InfoRow icon={<ListTodo className="size-3.5" />} label="Active tasks">
                  <span className="font-semibold">{member.activeTaskCount}</span>
                </InfoRow>
                <div className="border-b py-3 text-sm last:border-b-0">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="size-3.5" /> Logged this week
                    </span>
                    <span className="font-medium tabular-nums">
                      {fmtHours(member.loggedMinutesThisWeek)} · {pct}%
                    </span>
                  </div>
                  <UtilizationBar pct={pct} />
                </div>
                <InfoRow icon={<Wallet className="size-3.5" />} label="Hourly rate">
                  {member.hourlyRate != null ? formatINR(member.hourlyRate) : "—"}
                </InfoRow>
                <InfoRow icon={<Briefcase className="size-3.5" />} label="Designation">
                  {member.designation || "—"}
                </InfoRow>
                <InfoRow icon={<Building2 className="size-3.5" />} label="Department">
                  {member.department || "—"}
                </InfoRow>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {member.skills && member.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-1 text-xs font-medium text-accent"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No skills added yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ACCESS — role + module permissions */}
        <TabsContent value="access" className="mt-4">
          <AccessTab member={member} />
        </TabsContent>

        {/* ATTENDANCE — read-only calendar + summary for this member */}
        <TabsContent value="attendance" className="mt-4">
          <MemberAttendancePanel userId={member.id} />
        </TabsContent>

        {/* PROJECTS */}
        <TabsContent value="projects" className="mt-4">
          {member.projects && member.projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {member.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    {p.role && (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.role}
                      </p>
                    )}
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderKanban className="size-5" />}
              title="No projects"
              description="This member isn't assigned to any projects yet."
            />
          )}
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="mt-4">
          {member.activeTasks && member.activeTasks.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Active tasks</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wide">
                        Task
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide">
                        Project
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wide">
                        Due
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.activeTasks.map((t) => (
                      <TableRow key={t.id} className="hover:bg-transparent">
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>
                          <Link
                            href={`/projects/${t.projectId}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {t.projectName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <TaskStatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {t.dueDate ? formatDate(t.dueDate) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Activity className="size-5" />}
              title="No recent activity"
              description="Active tasks and recent work will appear here once this member gets going."
            />
          )}
        </TabsContent>

        {/* TIME LOGS */}
        <TabsContent value="timelogs" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total logged:{" "}
                <span className="font-semibold text-foreground">
                  {fmtHours(member.totalLoggedMinutes)}
                </span>
              </p>
              <Button size="sm" onClick={() => logTimeDialog.onOpen()}>
                <Plus className="size-4" /> Log time
              </Button>
            </div>

            {member.timeLogs && member.timeLogs.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] uppercase tracking-wide">
                          Date
                        </TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wide">
                          Project
                        </TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wide">
                          Note
                        </TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wide">
                          Time
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {member.timeLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-transparent">
                          <TableCell className="text-sm">
                            {log.workDate ? formatDate(log.workDate) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.projectId ? (
                              <Link
                                href={`/projects/${log.projectId}`}
                                className="text-primary hover:underline"
                              >
                                {log.projectName ?? "Project"}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                            {log.note || "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold tabular-nums">
                            {fmtHours(log.minutes)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                icon={<Clock className="size-5" />}
                title="No time logged yet"
                description="Log hours against projects to track utilization and billable work."
                action={
                  <Button size="sm" onClick={() => logTimeDialog.onOpen()}>
                    <Plus className="size-4" /> Log time
                  </Button>
                }
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <InviteMemberSheet
        open={editSheet.open}
        onOpenChange={editSheet.setOpen}
        member={member}
      />

      <LogTimeDialog
        open={logTimeDialog.open}
        onOpenChange={logTimeDialog.setOpen}
        memberId={member.id}
      />

      {/* Deactivate / reactivate confirm */}
      <Dialog
        open={deactivateDialog.open}
        onOpenChange={deactivateDialog.setOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isActive ? `Deactivate ${name}?` : `Reactivate ${name}?`}
            </DialogTitle>
            <DialogDescription>
              {isActive
                ? "They'll lose access until reactivated. Their history and assignments are preserved."
                : "They'll regain access to the workspace."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => deactivateDialog.onClose()}
              disabled={update.isPending}
            >
              Cancel
            </Button>
            <Button onClick={onToggleStatus} disabled={update.isPending}>
              {update.isPending
                ? "Saving…"
                : isActive
                  ? "Deactivate"
                  : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteDialog.open} onOpenChange={deleteDialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {name}?</DialogTitle>
            <DialogDescription>
              This removes the member from your team. This action can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => deleteDialog.onClose()}
              disabled={del.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={del.isPending}
            >
              {del.isPending ? "Removing…" : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
