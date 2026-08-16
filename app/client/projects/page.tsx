"use client";

import { FolderKanban } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useClientProjects } from "@/hooks/use-client-portal";
import { PortalProjectCard } from "../_components/project-card";
import { EmptyState, ErrorState } from "../_components/portal-bits";

export default function ClientProjectsPage() {
  const projects = useClientProjects();
  const list = projects.data ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Projects
        </h1>
        <p className="text-sm text-muted-foreground">
          {projects.isLoading
            ? "Loading your projects…"
            : `${list.length} project${list.length === 1 ? "" : "s"} in your workspace`}
        </p>
      </div>

      {projects.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      ) : projects.isError ? (
        <ErrorState onRetry={() => projects.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          hint="Once your team sets up a project, it'll show up here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <PortalProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
