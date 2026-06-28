"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  ListChecks,
  Flag,
  UsersRound,
  Timer,
  Radio,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { GlassCard } from "@/components/app/glass-card";
import {
  ProjectStatusBadge,
  ProjectHealthBadge,
  ProjectTypeBadge,
} from "@/components/app/project-badges";
import { ProjectFormSheet } from "@/components/app/project-form-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProject, useDeleteProject } from "@/hooks/use-projects";
import { useProjectOverview } from "@/hooks/use-project-insights";
import { useDisclosure } from "@/hooks/use-disclosure";
import { fmtDuration } from "@/hooks/use-timers";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/api/types";

import { OverviewTab } from "./_tabs/overview-tab";
import { TasksTab } from "./_tabs/tasks-tab";
import { MilestonesTab } from "./_tabs/milestones-tab";
import { TeamTab } from "./_tabs/team-tab";
import { ActivityTab } from "./_tabs/activity-tab";
import { ProjectTimerPill } from "./_project-timer-pill";

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <GlassCard className="p-4 border-[color-mix(in_srgb,var(--accent)_18%,var(--glass-border))]">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-md",
            emphasis
              ? "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-success"
              : "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <div
        className={cn(
          "mt-2.5 font-display text-2xl font-semibold leading-none tracking-tight tabular-nums",
          emphasis && "text-success",
        )}
      >
        {value}
      </div>
    </GlassCard>
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
  const { data: overview } = useProjectOverview(projectId);
  const deleteProject = useDeleteProject();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formSheet = useDisclosure<Project | null>();
  const deleteDialog = useDisclosure();

  // Deep-link target: a `?task=` URL must land on the Tasks tab so the detail
  // sheet (which lives in TasksTab and reads `?task=`) can open. The tab stays
  // controlled but free to switch afterwards; arriving with a task forces Tasks.
  const deepLinkedTask = searchParams.get("task");
  const [tab, setTab] = React.useState<string>(
    deepLinkedTask ? "tasks" : "overview",
  );
  // If a task link is opened after mount (e.g. client-side nav), switch to Tasks.
  React.useEffect(() => {
    if (deepLinkedTask) setTab("tasks");
  }, [deepLinkedTask]);

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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
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

  // Stat values prefer the live overview rollup; fall back to the project row.
  const tasksDone = overview?.taskDone ?? project.tasksDone;
  const tasksTotal = overview?.taskTotal ?? project.tasksTotal;
  const msDone = overview?.milestoneDone ?? project.milestonesDone;
  const msTotal = overview?.milestoneTotal ?? project.milestonesTotal;
  const memberCount = overview?.memberCount ?? project.memberCount;
  const totalTime = overview?.totalTimeMinutes ?? 0;
  const activeNow = overview?.activeTimerCount ?? 0;

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

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={<ListChecks className="size-4" />}
          label="Tasks"
          value={`${tasksDone}/${tasksTotal}`}
        />
        <StatCard
          icon={<Flag className="size-4" />}
          label="Milestones"
          value={`${msDone}/${msTotal}`}
        />
        <StatCard
          icon={<UsersRound className="size-4" />}
          label="Team"
          value={memberCount}
        />
        <StatCard
          icon={<Timer className="size-4" />}
          label="Time logged"
          value={fmtDuration(totalTime)}
        />
        <StatCard
          icon={<Radio className="size-4" />}
          label="Working now"
          value={activeNow}
          emphasis={activeNow > 0}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-5">
          <TasksTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-5">
          <MilestonesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="team" className="mt-5">
          <TeamTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="activity" className="mt-5">
          <ActivityTab projectId={project.id} />
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
              milestones, time logs, and team assignments. This can&apos;t be
              undone.
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

      {/* Floating running-timer pill for this project (sticks while you move
          between tabs). Hidden unless the user's active timer is here. */}
      <ProjectTimerPill projectId={project.id} />
    </div>
  );
}
