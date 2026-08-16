"use client";

import { useQueries } from "@tanstack/react-query";
import { Users2 } from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/utils";
import { clientPortalApi } from "@/lib/api/client-portal";
import { useClientProjects } from "@/hooks/use-client-portal";
import { EmptyState, ErrorState, humanize } from "../_components/portal-bits";

interface AggregatedMember {
  id: string;
  name: string;
  roles: Set<string>;
  projects: Set<string>;
}

export default function ClientTeamPage() {
  const projects = useClientProjects();
  const list = projects.data ?? [];

  // Fan out one team query per project, then dedupe members across projects.
  const teamQueries = useQueries({
    queries: list.map((p) => ({
      queryKey: ["client-portal", "projects", p.id, "team"],
      queryFn: () => clientPortalApi.projectTeam(p.id),
      enabled: Boolean(p.id),
    })),
  });

  const teamsLoading = teamQueries.some((q) => q.isLoading);

  const byId = new Map<string, AggregatedMember>();
  teamQueries.forEach((q, i) => {
    const projectName = list[i]?.name ?? "";
    (q.data ?? []).forEach((m) => {
      const entry =
        byId.get(m.id) ??
        ({ id: m.id, name: m.name, roles: new Set(), projects: new Set() } as AggregatedMember);
      if (m.role) entry.roles.add(m.role);
      if (projectName) entry.projects.add(projectName);
      byId.set(m.id, entry);
    });
  });
  const members = Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Team
        </h1>
        <p className="text-sm text-muted-foreground">
          The team working on your projects.
        </p>
      </div>

      {projects.isLoading || (list.length > 0 && teamsLoading) ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : projects.isError ? (
        <ErrorState onRetry={() => projects.refetch()} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No team members yet"
          hint="Once people are assigned to your projects, you'll see them here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const roleLabel = Array.from(m.roles).map(humanize).join(" · ");
            const projectCount = m.projects.size;
            return (
              <GlassCard key={m.id} className="flex items-center gap-3.5 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-sm font-bold text-accent">
                  {initials(m.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.name}</p>
                  {roleLabel && (
                    <p className="truncate text-xs text-muted-foreground">
                      {roleLabel}
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                    {projectCount} project{projectCount === 1 ? "" : "s"}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
