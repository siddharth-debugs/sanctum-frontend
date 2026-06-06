"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Plus,
  ListChecks,
  Flag,
  UsersRound,
  CheckCircle2,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { GlassCard } from "@/components/app/glass-card";
import {
  ProjectStatusBadge,
  ProjectHealthBadge,
  ProjectTypeBadge,
} from "@/components/app/project-badges";
import {
  TASK_STATUSES,
  TASK_STATUS_DOT,
} from "@/lib/constants/project-options";
import type { ProjectTaskStatus } from "@/lib/api/types";
import { ProjectFormSheet } from "@/components/app/project-form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProject, useDeleteProject } from "@/hooks/use-projects";
import {
  useProjectTasks,
  useCreateProjectTask,
  useUpdateProjectTask,
  useDeleteProjectTask,
} from "@/hooks/use-project-tasks";
import {
  useProjectMilestones,
  useCreateProjectMilestone,
  useUpdateProjectMilestone,
  useDeleteProjectMilestone,
} from "@/hooks/use-project-milestones";
import {
  useProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
} from "@/hooks/use-project-members";
import { useTeam } from "@/hooks/use-team";
import { useDisclosure } from "@/hooks/use-disclosure";
import { ApiError } from "@/lib/api/client";
import { initials, formatDate } from "@/lib/utils";
import {
  PROJECT_TYPE_LABEL,
  formatCurrency,
} from "@/lib/constants/project-options";
import type { Project } from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <GlassCard className="p-5 border-[color-mix(in_srgb,var(--accent)_18%,var(--glass-border))]">
      <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3.5 font-display text-3xl font-semibold leading-none tracking-tight">
        {value}
      </div>
    </GlassCard>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center">
      <span className="grid size-11 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="font-display text-sm font-semibold">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tasks tab                                                           */
/* ------------------------------------------------------------------ */

function TasksTab({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const { data: team } = useTeam();
  const createTask = useCreateProjectTask(projectId);
  const updateTask = useUpdateProjectTask(projectId);
  const deleteTask = useDeleteProjectTask(projectId);

  const [title, setTitle] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState<string>("none");
  const [status, setStatus] = React.useState<ProjectTaskStatus>("todo");
  const [due, setDue] = React.useState("");

  const teamOptions = team ?? [];

  const onAdd = () => {
    const t = title.trim();
    if (!t) return;
    createTask.mutate(
      {
        title: t,
        status,
        assigneeId: assigneeId === "none" ? null : assigneeId,
        dueDate: due ? new Date(due).toISOString() : null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setAssigneeId("none");
          setDue("");
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add task",
          ),
      },
    );
  };

  const setTaskStatus = (taskId: string, next: ProjectTaskStatus) => {
    updateTask.mutate({ taskId, input: { status: next } });
  };

  // Group tasks into the 5 canonical status columns.
  const byStatus = React.useMemo(() => {
    const map: Record<ProjectTaskStatus, typeof tasks> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const task of tasks ?? []) (map[task.status] ??= []).push(task);
    return map;
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Add task row */}
      <GlassCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
          }}
          placeholder="Add a task…"
          className="flex-1"
        />
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ProjectTaskStatus)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeId} onValueChange={setAssigneeId}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {teamOptions.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.fullName ?? m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="w-full sm:w-40"
        />
        <Button onClick={onAdd} disabled={createTask.isPending || !title.trim()}>
          <Plus className="size-4" /> Add
        </Button>
      </GlassCard>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading tasks…
        </p>
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-5" />}
          title="No tasks yet"
          description="Break the project into tasks and move them across the board. For a milestone × status grid, open Task Breakdown."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {TASK_STATUSES.map((col) => {
            const colTasks = byStatus[col.value] ?? [];
            return (
              <div
                key={col.value}
                className="flex flex-col rounded-xl border bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]"
              >
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: col.dot }}
                    />
                    {col.label}
                  </span>
                  <span className="rounded-full bg-background/70 px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-2">
                  {colTasks.length === 0 ? (
                    <p className="px-1 py-3 text-center text-xs text-muted-foreground/70">
                      Empty
                    </p>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group rounded-lg border bg-card p-2.5 shadow-[0_1px_2px_rgba(43,28,31,0.04)]"
                      >
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                            {task.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            onClick={() => deleteTask.mutate(task.id)}
                            aria-label="Delete task"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {task.assigneeName && (
                              <Avatar size="sm">
                                <AvatarFallback className="text-[10px]">
                                  {initials(task.assigneeName)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            {task.dueDate && (
                              <span>{formatDate(task.dueDate)}</span>
                            )}
                          </div>
                          <Select
                            value={task.status}
                            onValueChange={(v) =>
                              setTaskStatus(task.id, v as ProjectTaskStatus)
                            }
                          >
                            <SelectTrigger
                              size="sm"
                              className="h-6 w-auto gap-1 border-none bg-transparent px-1.5 text-xs text-muted-foreground shadow-none hover:bg-muted"
                            >
                              <span
                                className="size-1.5 rounded-full"
                                style={{
                                  backgroundColor: TASK_STATUS_DOT[task.status],
                                }}
                              />
                            </SelectTrigger>
                            <SelectContent align="end">
                              {TASK_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Milestones tab                                                      */
/* ------------------------------------------------------------------ */

function MilestonesTab({ projectId }: { projectId: string }) {
  const { data: milestones, isLoading } = useProjectMilestones(projectId);
  const createMs = useCreateProjectMilestone(projectId);
  const updateMs = useUpdateProjectMilestone(projectId);
  const deleteMs = useDeleteProjectMilestone(projectId);

  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("");

  const onAdd = () => {
    const t = title.trim();
    if (!t) return;
    createMs.mutate(
      { title: t, dueDate: due ? new Date(due).toISOString() : null },
      {
        onSuccess: () => {
          setTitle("");
          setDue("");
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add milestone",
          ),
      },
    );
  };

  const toggle = (milestoneId: string, completed: boolean) => {
    updateMs.mutate({
      milestoneId,
      input: { status: completed ? "completed" : "pending" },
    });
  };

  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
          }}
          placeholder="Add a milestone…"
          className="flex-1"
        />
        <Input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="w-full sm:w-40"
        />
        <Button onClick={onAdd} disabled={createMs.isPending || !title.trim()}>
          <Plus className="size-4" /> Add
        </Button>
      </GlassCard>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading milestones…
        </p>
      ) : !milestones || milestones.length === 0 ? (
        <EmptyState
          icon={<Flag className="size-5" />}
          title="No milestones yet"
          description="Track major checkpoints and delivery dates for this project."
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {milestones.map((ms) => {
            const completed = ms.status === "completed";
            return (
              <div key={ms.id} className="flex items-center gap-3 px-4 py-3">
                <Checkbox
                  checked={completed}
                  onCheckedChange={(v) => toggle(ms.id, !!v)}
                  aria-label="Toggle complete"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      completed
                        ? "truncate text-sm text-muted-foreground line-through"
                        : "truncate text-sm font-medium"
                    }
                  >
                    {ms.title}
                  </p>
                  {ms.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Due {formatDate(ms.dueDate)}
                    </p>
                  )}
                </div>
                {completed && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="size-3.5" /> Done
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMs.mutate(ms.id)}
                  aria-label="Delete milestone"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team tab                                                            */
/* ------------------------------------------------------------------ */

function TeamTab({ projectId }: { projectId: string }) {
  const { data: members, isLoading } = useProjectMembers(projectId);
  const { data: team } = useTeam();
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);

  const [userId, setUserId] = React.useState<string>("");

  const memberUserIds = new Set((members ?? []).map((m) => m.userId));
  const candidates = (team ?? []).filter((m) => !memberUserIds.has(m.id));

  const onAdd = () => {
    if (!userId) return;
    addMember.mutate(
      { userId },
      {
        onSuccess: () => setUserId(""),
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't add member",
          ),
      },
    );
  };

  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Add a team member…" />
          </SelectTrigger>
          <SelectContent>
            {candidates.length === 0 ? (
              <SelectItem value="__none" disabled>
                Everyone is already on this project
              </SelectItem>
            ) : (
              candidates.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.fullName ?? m.email}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          onClick={onAdd}
          disabled={addMember.isPending || !userId}
        >
          <Plus className="size-4" /> Add member
        </Button>
      </GlassCard>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading team…
        </p>
      ) : !members || members.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="size-5" />}
          title="No members yet"
          description="Add agency users to collaborate on this project."
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar size="sm">
                <AvatarFallback className="text-[10px]">
                  {initials(m.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.userName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.userEmail}
                </p>
              </div>
              <span className="text-xs capitalize text-muted-foreground">
                {m.role}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeMember.mutate(m.id)}
                aria-label="Remove member"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */

function OverviewTab({ project }: { project: Project }) {
  const { data: tasks } = useProjectTasks(project.id);
  const { data: milestones } = useProjectMilestones(project.id);

  const recentTasks = (tasks ?? []).slice(0, 4);
  const recentMilestones = (milestones ?? []).slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Client">
            <Link
              href={`/clients/${project.clientId}`}
              className="text-primary hover:underline"
            >
              {project.clientName}
            </Link>
          </InfoRow>
          <InfoRow label="Type">{PROJECT_TYPE_LABEL[project.type]}</InfoRow>
          <InfoRow label="Contract value">
            {formatCurrency(project.contractValue, project.currency)}
          </InfoRow>
          <InfoRow label="Start date">
            {project.startDate ? formatDate(project.startDate) : "—"}
          </InfoRow>
          <InfoRow label="Deadline">
            {project.deadline ? formatDate(project.deadline) : "—"}
          </InfoRow>
          <InfoRow label="Health">
            <ProjectHealthBadge health={project.health} />
          </InfoRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {project.description && (
            <p className="text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Tasks
            </p>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {recentTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className={
                        t.status === "done"
                          ? "size-1.5 rounded-full bg-success"
                          : "size-1.5 rounded-full bg-muted-foreground/50"
                      }
                    />
                    <span
                      className={
                        t.status === "done"
                          ? "truncate text-muted-foreground line-through"
                          : "truncate"
                      }
                    >
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Milestones
            </p>
            {recentMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No milestones yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {recentMilestones.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Flag className="size-3.5 text-accent" />
                    <span
                      className={
                        m.status === "completed"
                          ? "truncate text-muted-foreground line-through"
                          : "truncate"
                      }
                    >
                      {m.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = React.use(params);
  const { data: project, isLoading, error } = useProject(projectId);
  const deleteProject = useDeleteProject();
  const router = useRouter();
  const formSheet = useDisclosure<Project | null>();
  const deleteDialog = useDisclosure();

  const onConfirmDelete = () => {
    if (!project) return;
    deleteProject.mutate(project.id, {
      onSuccess: () => {
        toast.success(`${project.name} deleted`);
        deleteDialog.onClose();
        router.push("/projects");
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError ? err.message : "Could not delete project",
        ),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Projects", href: "/projects" },
            { label: "Project" },
          ]}
          title="Project not found"
          description="This project may have been removed or you don't have access."
        />
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {project.name}
            <ProjectStatusBadge status={project.status} />
            <ProjectHealthBadge health={project.health} />
            <ProjectTypeBadge type={project.type} />
          </span>
        }
        description={
          <Link
            href={`/clients/${project.clientId}`}
            className="text-primary hover:underline"
          >
            {project.clientName}
          </Link>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => formSheet.onOpen(project)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteDialog.onOpen()}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ListChecks className="size-4" />}
          label="Tasks"
          value={`${project.tasksDone}/${project.tasksTotal}`}
        />
        <StatCard
          icon={<Flag className="size-4" />}
          label="Milestones"
          value={`${project.milestonesDone}/${project.milestonesTotal}`}
        />
        <StatCard
          icon={<UsersRound className="size-4" />}
          label="Team"
          value={project.memberCount}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab project={project} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TasksTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <MilestonesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <TeamTab projectId={project.id} />
        </TabsContent>
      </Tabs>

      <ProjectFormSheet
        open={formSheet.open}
        onOpenChange={formSheet.setOpen}
        project={formSheet.data}
      />

      <Dialog open={deleteDialog.open} onOpenChange={deleteDialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {project.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the project along with its tasks,
              milestones, and team assignments. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => deleteDialog.onClose()}
              disabled={deleteProject.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
