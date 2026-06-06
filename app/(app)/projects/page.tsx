"use client";

import * as React from "react";
import { Plus, FolderKanban, Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ProjectCard } from "@/components/app/project-card";
import { ProjectFormSheet } from "@/components/app/project-form-sheet";
import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/use-projects";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  PROJECT_STATUS_OPTIONS,
  PROJECT_HEALTH_OPTIONS,
} from "@/lib/constants/project-options";

const ALL = "all";

export default function ProjectsPage() {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState(ALL);
  const [health, setHealth] = React.useState(ALL);
  const formSheet = useDisclosure();

  const { data, isLoading, error } = useProjects({
    status: status === ALL ? undefined : status,
    health: health === ALL ? undefined : health,
    search: search.trim() || undefined,
  });

  // Belt-and-suspenders client-side filter (backend already filters when supported).
  const projects = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (status !== ALL && p.status !== status) return false;
      if (health !== ALL && p.health !== health) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.clientName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, status, health]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={
          <>
            <FolderKanban className="size-3" /> Projects
          </>
        }
        title="Projects"
        description="Plan scopes, track tasks and milestones, and keep every client engagement on track."
        actions={
          <Button onClick={() => formSheet.onOpen()}>
            <Plus className="size-4" /> New project
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or clients…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {PROJECT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={health} onValueChange={setHealth}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All health</SelectItem>
            {PROJECT_HEALTH_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <GlassCard className="p-10 text-center text-sm text-muted-foreground">
          Couldn&apos;t load projects. Please retry.
        </GlassCard>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
            <FolderKanban className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold">
              No projects yet — create one
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {data && data.length > 0
                ? "No projects match your filters."
                : "Start a project to track tasks, milestones, and the team."}
            </p>
          </div>
          <Button onClick={() => formSheet.onOpen()}>
            <Plus className="size-4" /> New project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <ProjectFormSheet open={formSheet.open} onOpenChange={formSheet.setOpen} />
    </div>
  );
}
