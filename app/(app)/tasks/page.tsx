"use client";

import * as React from "react";
import Link from "next/link";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderKanban,
  Search,
  Filter,
  Layers,
  Kanban,
  List,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/app/tasks/status-badge";
import { PriorityIcon } from "@/components/app/tasks/priority-icon";
import { AssigneeAvatar } from "@/components/app/tasks/assignee-avatar";
import { DueChip } from "@/components/app/tasks/due-chip";
import { useProjects } from "@/hooks/use-projects";
import {
  useAllTasks,
  useMyTasks,
  useUpdateCrossProjectTask,
  type CrossProjectTask,
} from "@/hooks/use-all-tasks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProjectTaskStatus, ProjectTaskPriority } from "@/lib/api/types";

const STATUS_COLUMNS: Array<{ id: ProjectTaskStatus; label: string }> = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Completed" },
];

export default function TasksPage() {
  const [scopeTab, setScopeTab] = React.useState<"me" | "all">("me");
  const [viewMode, setViewMode] = React.useState<"list" | "board">("list");
  const [selectedProject, setSelectedProject] = React.useState<string>("all");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: projectsData = [] } = useProjects();
  const { data: myTasksList = [], isLoading: myLoading, refetch: refetchMy } = useMyTasks({
    includeDone: true,
  });

  const { data: allTasksList = [], isLoading: allLoading, refetch: refetchAll } = useAllTasks({
    projectId: selectedProject !== "all" ? selectedProject : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    priority: selectedPriority !== "all" ? selectedPriority : undefined,
    search: searchQuery.trim() || undefined,
  });

  const updateTaskMutation = useUpdateCrossProjectTask();

  const activeRawTasks = scopeTab === "me" ? myTasksList : allTasksList;
  const isLoading = scopeTab === "me" ? myLoading : allLoading;

  const filteredTasks = React.useMemo(() => {
    return activeRawTasks.filter((t) => {
      if (selectedProject !== "all" && t.projectId !== selectedProject) return false;
      if (selectedStatus !== "all" && t.status !== selectedStatus) return false;
      if (selectedPriority !== "all" && t.priority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchProject = t.projectName?.toLowerCase().includes(q);
        const matchClient = t.clientName?.toLowerCase().includes(q);
        if (!matchTitle && !matchProject && !matchClient) return false;
      }
      return true;
    });
  }, [activeRawTasks, selectedProject, selectedStatus, selectedPriority, searchQuery]);

  // KPI Metrics
  const openTasks = filteredTasks.filter((t) => t.status !== "done");
  const dueToday = filteredTasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear() &&
      t.status !== "done"
    );
  });
  const overdueTasks = filteredTasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    return new Date(t.dueDate).getTime() < Date.now();
  });
  const completedTasks = filteredTasks.filter((t) => t.status === "done");

  const handleStatusChange = async (task: CrossProjectTask, newStatus: ProjectTaskStatus) => {
    try {
      await updateTaskMutation.mutateAsync({
        projectId: task.projectId,
        taskId: task.id,
        status: newStatus,
      });
      toast.success("Task updated");
      if (scopeTab === "me") refetchMy();
      else refetchAll();
    } catch {
      toast.error("Failed to update task status");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Agency Deliverables"
        title="Task Management"
        description="Track, prioritize, and manage cross-project deliverables across your entire agency."
        actions={
          <div className="flex items-center gap-2">
            {/* Scope Switcher */}
            <div className="inline-flex rounded-lg border bg-card p-1">
              <button
                type="button"
                onClick={() => setScopeTab("me")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  scopeTab === "me"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Assigned to Me
              </button>
              <button
                type="button"
                onClick={() => setScopeTab("all")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  scopeTab === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All Agency Tasks
              </button>
            </div>

            {/* View Mode */}
            <div className="inline-flex rounded-lg border bg-card p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="List View"
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "board"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Board View"
              >
                <Kanban className="size-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Open Tasks"
          value={openTasks.length}
          icon={ListTodo}
          hint="In-progress deliverables"
        />
        <KpiCard
          label="Due Today"
          value={dueToday.length}
          icon={Clock}
          hint="Action needed today"
        />
        <KpiCard
          label="Overdue Tasks"
          value={overdueTasks.length}
          icon={AlertCircle}
          hint="Past scheduled deadline"
        />
        <KpiCard
          label="Completed"
          value={completedTasks.length}
          icon={CheckCircle2}
          hint="Finished deliverables"
        />
      </div>

      {/* Filter Toolbar */}
      <GlassCard className="p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, project names, clients..."
              className="pl-9 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projectsData.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Main Content: List or Board */}
      {isLoading ? (
        <GlassCard className="p-12 text-center text-muted-foreground text-sm">
          Loading deliverables...
        </GlassCard>
      ) : filteredTasks.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center p-12 text-center">
          <ListTodo className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-display font-medium text-foreground">No tasks found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {searchQuery || selectedProject !== "all"
              ? "Try adjusting your filters or search query to find tasks."
              : "You're all caught up! No open deliverables matching this view."}
          </p>
        </GlassCard>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <GlassCard
              key={task.id}
              className="group p-4 transition-colors hover:border-primary/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="pt-0.5 shrink-0">
                  <PriorityIcon priority={task.priority ?? "medium"} size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/projects/${task.projectId}`}
                      className="font-medium text-foreground hover:text-primary transition-colors truncate"
                    >
                      {task.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    {task.projectName && (
                      <Link
                        href={`/projects/${task.projectId}`}
                        className="inline-flex items-center gap-1 hover:text-foreground font-medium"
                      >
                        <FolderKanban className="size-3 text-primary" />
                        {task.projectName}
                      </Link>
                    )}
                    {task.clientName && (
                      <>
                        <span>•</span>
                        <span>{task.clientName}</span>
                      </>
                    )}
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <DueChip date={task.dueDate} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <AssigneeAvatar name={task.assigneeName} size="sm" showName />

                <Select
                  value={task.status}
                  onValueChange={(val) => handleStatusChange(task, val as ProjectTaskStatus)}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <StatusBadge status={task.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="done">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" className="size-8" asChild>
                  <Link href={`/projects/${task.projectId}`} title="Open Project">
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </Link>
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        /* Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <GlassCard key={col.id} className="flex flex-col p-3 gap-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={col.id} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[280px]">
                  {colTasks.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground/60">
                      Empty column
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg border border-border/80 bg-card/90 shadow-sm hover:border-primary/40 transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-sm text-foreground line-clamp-2 leading-snug">
                            {task.title}
                          </span>
                          <PriorityIcon priority={task.priority ?? "medium"} size={14} />
                        </div>

                        {task.projectName && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <FolderKanban className="size-3 text-primary shrink-0" />
                            <span className="truncate">{task.projectName}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                          <DueChip date={task.dueDate} />
                          <AssigneeAvatar name={task.assigneeName} size="sm" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
