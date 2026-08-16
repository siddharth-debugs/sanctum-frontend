"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderKanban,
  Activity,
  CheckCircle2,
  Files,
  ArrowRight,
  FileText,
  ShieldCheck,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { GlassCard } from "@/components/app/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientMe,
  useClientProjects,
  useClientFiles,
  useClientPortalProposals,
  useClientPortalAgreements,
  useClientPortalInvoices,
} from "@/hooks/use-client-portal";
import { PortalProjectCard } from "./_components/project-card";
import { FileRow } from "./_components/file-row";
import { EmptyState, ErrorState } from "./_components/portal-bits";

function firstName(full: string | null | undefined, email: string): string {
  const name = full?.trim();
  if (name) return name.split(" ")[0];
  return email.split("@")[0];
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  loading?: boolean;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
        <span className="grid size-8 place-items-center rounded-md bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary">
          <Icon className="size-4" />
        </span>
        {label}
      </div>
      <div className="mt-3.5 font-display text-2xl font-semibold leading-none tracking-tight tabular-nums">
        {loading ? <Skeleton className="h-7 w-16" /> : value}
      </div>
    </GlassCard>
  );
}

export default function ClientOverviewPage() {
  const me = useClientMe();
  const projects = useClientProjects();
  const files = useClientFiles();
  const proposals = useClientPortalProposals();
  const agreements = useClientPortalAgreements();
  const invoices = useClientPortalInvoices();

  const list = projects.data ?? [];
  const total = list.length;
  const active = list.filter((p) =>
    ["active", "in_progress"].includes(p.status?.toLowerCase()),
  ).length;
  const done = list.filter((p) =>
    ["completed", "done"].includes(p.status?.toLowerCase()),
  ).length;
  const overall =
    total > 0
      ? Math.round(list.reduce((sum, p) => sum + (p.progress ?? 0), 0) / total)
      : 0;

  const pendingAgreements = (agreements.data ?? []).filter(
    (a: any) => a.status === "sent" || a.status === "draft"
  );
  const pendingProposals = (proposals.data ?? []).filter(
    (pr: any) => pr.status === "sent" || pr.status === "viewed"
  );
  const unpaidInvoices = (invoices.data ?? []).filter(
    (inv: any) => inv.balanceDue > 0
  );

  const recentFiles = (files.data ?? []).slice(0, 4);
  const topProjects = list.slice(0, 4);

  const greetingName = me.data
    ? firstName(me.data.user?.fullName, me.data.user?.email ?? "")
    : "";

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {me.data?.client?.name ?? "Welcome"}
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {greetingName ? `Hi, ${greetingName}` : "Welcome back"}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Here's a snapshot of your projects, documents, and statements from your agency team.
        </p>
      </div>

      {/* Action Banners */}
      {(pendingAgreements.length > 0 || pendingProposals.length > 0 || unpaidInvoices.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {pendingAgreements.length > 0 && (
            <Link
              href="/client/agreements"
              className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition-all text-xs"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-5 text-amber-500 shrink-0" />
                <div>
                  <span className="font-semibold text-foreground block">
                    {pendingAgreements.length} Agreement Pending
                  </span>
                  <span className="text-muted-foreground text-[11px]">Ready for digital signature</span>
                </div>
              </div>
              <ArrowRight className="size-4 text-amber-500" />
            </Link>
          )}

          {pendingProposals.length > 0 && (
            <Link
              href="/client/proposals"
              className="flex items-center justify-between p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 transition-all text-xs"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="size-5 text-blue-500 shrink-0" />
                <div>
                  <span className="font-semibold text-foreground block">
                    {pendingProposals.length} New Proposal
                  </span>
                  <span className="text-muted-foreground text-[11px]">Awaiting your review</span>
                </div>
              </div>
              <ArrowRight className="size-4 text-blue-500" />
            </Link>
          )}

          {unpaidInvoices.length > 0 && (
            <Link
              href="/client/invoices"
              className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 transition-all text-xs"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="size-5 text-primary shrink-0" />
                <div>
                  <span className="font-semibold text-foreground block">
                    {unpaidInvoices.length} Outstanding Invoice
                  </span>
                  <span className="text-muted-foreground text-[11px]">View billing details</span>
                </div>
              </div>
              <ArrowRight className="size-4 text-primary" />
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={total}
          icon={FolderKanban}
          loading={projects.isLoading}
        />
        <StatCard
          label="Overall progress"
          value={`${overall}%`}
          icon={Activity}
          loading={projects.isLoading}
        />
        <StatCard
          label="Active"
          value={active}
          icon={CheckCircle2}
          loading={projects.isLoading}
        />
        <StatCard
          label="Shared files"
          value={files.data?.length ?? 0}
          icon={Files}
          loading={files.isLoading}
        />
      </div>

      {/* Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Your projects
          </h2>
          {total > topProjects.length && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/client/projects">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>

        {projects.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-lg" />
            ))}
          </div>
        ) : projects.isError ? (
          <ErrorState onRetry={() => projects.refetch()} />
        ) : total === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            hint="Once your team sets up a project, it'll show up here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {topProjects.map((p) => (
              <PortalProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* Recent files */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Recent files
          </h2>
          {(files.data?.length ?? 0) > recentFiles.length && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/client/files">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>

        {files.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : files.isError ? (
          <ErrorState onRetry={() => files.refetch()} />
        ) : recentFiles.length === 0 ? (
          <EmptyState
            icon={Files}
            title="No files shared yet"
            hint="Documents and links your team shares will appear here."
          />
        ) : (
          <div className="space-y-2">
            {recentFiles.map((f) => (
              <FileRow key={f.id} file={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
