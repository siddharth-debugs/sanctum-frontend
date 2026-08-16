"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  Activity,
  FolderKanban,
  HeartPulse,
  ListChecks,
  TriangleAlert,
  UserCheck,
  Users,
} from "lucide-react";

import { KpiCard } from "@/components/app/kpi-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SectionCard, BarBreakdown, type BarDatum } from "@/components/app/dashboard/shared";
import { useTeamOverview } from "@/hooks/use-my-day";
import { useWhosIn, useTeamSummary } from "@/hooks/use-attendance";
import { fmtDuration } from "@/hooks/use-timers";
import {
  TASK_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_HEALTH_LABEL,
} from "@/lib/constants/project-options";
import { ATTENDANCE_STATUS_META, currentMonthKey, monthLabel } from "@/lib/constants/attendance-options";
import { initials } from "@/lib/utils";
import type {
  ProjectHealth,
  ProjectStatus,
  TeamSummaryRow,
  WhosInMember,
} from "@/lib/api/types";

/* ------------------------------------------------------------------ */
/* Token colour maps (raw CSS expressions for bars / dots)             */
/* ------------------------------------------------------------------ */

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  planning: "var(--muted-foreground)",
  active: "var(--primary)",
  on_hold: "var(--warning)",
  completed: "var(--success)",
  cancelled: "var(--destructive)",
};

const HEALTH_COLOR: Record<ProjectHealth, string> = {
  on_track: "var(--success)",
  at_risk: "var(--warning)",
  off_track: "var(--destructive)",
};

const HEALTH_ORDER: ProjectHealth[] = ["on_track", "at_risk", "off_track"];

/* ------------------------------------------------------------------ */
/* Manager dashboard — team & delivery overview                        */
/* ------------------------------------------------------------------ */

export function ManagerDashboard() {
  const { data, isLoading } = useTeamOverview();
  const month = currentMonthKey();
  const whosIn = useWhosIn();
  const teamSummary = useTeamSummary(month);

  const projectTotal = React.useMemo(
    () => Object.values(data?.projectsByStatus ?? {}).reduce((s, n) => s + (n ?? 0), 0),
    [data],
  );
  const needsAttention =
    (data?.projectsByHealth.at_risk ?? 0) + (data?.projectsByHealth.off_track ?? 0);

  const healthBars: BarDatum[] = HEALTH_ORDER.map((h) => ({
    key: h,
    name: PROJECT_HEALTH_LABEL[h],
    value: data?.projectsByHealth[h] ?? 0,
    color: HEALTH_COLOR[h],
  }));

  const statusBars: BarDatum[] = (
    Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]
  )
    .map((s) => ({
      key: s,
      name: PROJECT_STATUS_LABEL[s],
      value: data?.projectsByStatus[s] ?? 0,
      color: PROJECT_STATUS_COLOR[s],
    }))
    .filter((d) => d.value > 0);

  const taskData = TASK_STATUSES.map((s) => ({
    key: s.value,
    name: s.label,
    color: s.dot,
    value: data?.tasksByStatus[s.value] ?? 0,
  })).filter((d) => d.value > 0);
  const taskTotal = taskData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active projects"
          icon={FolderKanban}
          value={isLoading ? "—" : data?.activeProjects ?? 0}
          hint={`${projectTotal} total`}
        />
        <KpiCard
          label="Team members"
          icon={Users}
          value={isLoading ? "—" : data?.memberCount ?? 0}
          hint="in your agency"
        />
        <KpiCard
          label="Needs attention"
          icon={TriangleAlert}
          value={
            isLoading ? (
              "—"
            ) : needsAttention > 0 ? (
              <span className="text-warning">{needsAttention}</span>
            ) : (
              0
            )
          }
          hint="at risk / off track"
        />
        <KpiCard
          label="In progress"
          icon={Activity}
          value={isLoading ? "—" : data?.tasksByStatus.in_progress ?? 0}
          hint="tasks being worked"
        />
      </div>

      {/* Delivery health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Project health"
          description="How delivery is tracking"
          icon={HeartPulse}
          isLoading={isLoading}
          isEmpty={!isLoading && projectTotal === 0}
          emptyIcon={FolderKanban}
          emptyText="No projects yet."
        >
          <BarBreakdown
            data={healthBars}
            footer={`${projectTotal} project${projectTotal === 1 ? "" : "s"} total`}
          />
        </SectionCard>

        <SectionCard
          title="Projects by status"
          description="Distribution across the pipeline"
          icon={FolderKanban}
          isLoading={isLoading}
          isEmpty={!isLoading && statusBars.length === 0}
          emptyIcon={FolderKanban}
          emptyText="No projects yet."
        >
          <BarBreakdown data={statusBars} />
        </SectionCard>
      </div>

      {/* Tasks donut + who's in */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Tasks by status"
          description="Every task across the agency"
          icon={ListChecks}
          isLoading={isLoading}
          isEmpty={!isLoading && taskData.length === 0}
          emptyIcon={ListChecks}
          emptyText="No tasks yet."
        >
          <div className="flex items-center gap-4">
            <ChartContainer config={{}} className="aspect-square h-[170px] w-[170px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={taskData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={76}
                  strokeWidth={3}
                  stroke="var(--card)"
                >
                  {taskData.map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex-1 space-y-2">
              {taskData.map((d) => (
                <div key={d.key} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
                  {d.name}
                  <b className="ml-auto font-semibold tabular-nums">{d.value}</b>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">{taskTotal} tasks total</p>
            </div>
          </div>
        </SectionCard>

        <WhosInCard
          isLoading={whosIn.isLoading}
          members={whosIn.data?.members ?? []}
        />
      </div>

      {/* Team attendance summary */}
      <TeamAttendanceStrip
        month={month}
        isLoading={teamSummary.isLoading}
        rows={teamSummary.data?.members ?? []}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Who's in today                                                      */
/* ------------------------------------------------------------------ */

function WhosInCard({
  isLoading,
  members,
}: {
  isLoading: boolean;
  members: WhosInMember[];
}) {
  // "In" = anyone who has punched in today (present / late / half day).
  const inMembers = members.filter(
    (m) => m.checkInAt && ["present", "late", "half_day"].includes(m.status),
  );
  return (
    <SectionCard
      title="Who's in today"
      description="Live check-in status"
      icon={UserCheck}
      isLoading={isLoading}
      isEmpty={!isLoading && inMembers.length === 0}
      emptyIcon={UserCheck}
      emptyText="Nobody has checked in yet today."
      action={
        members.length > 0 ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--success)_14%,transparent)] px-2.5 py-1 text-xs font-semibold tabular-nums text-success">
            {inMembers.length} / {members.length} in
          </span>
        ) : null
      }
    >
      <ul className="max-h-[18rem] space-y-2 overflow-y-auto pr-1">
        {inMembers.map((m) => {
          const meta = ATTENDANCE_STATUS_META[m.status] ?? ATTENDANCE_STATUS_META.none;
          return (
            <li key={m.userId} className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarFallback>{initials(m.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {m.name}
              </span>
              {m.isLate && (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                  Late
                </span>
              )}
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {fmtDuration(m.workedMinutes)}
              </span>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: meta.color }}
                title={meta.label}
              />
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Team attendance summary (month rollup)                              */
/* ------------------------------------------------------------------ */

function TeamAttendanceStrip({
  month,
  isLoading,
  rows,
}: {
  month: string;
  isLoading: boolean;
  rows: TeamSummaryRow[];
}) {
  const agg = React.useMemo(() => {
    const a = { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0 };
    for (const r of rows) {
      a.present += r.summary.present ?? 0;
      a.late += r.summary.late ?? 0;
      a.halfDay += r.summary.halfDay ?? 0;
      a.absent += r.summary.absent ?? 0;
      a.onLeave += r.summary.onLeave ?? 0;
    }
    return a;
  }, [rows]);

  const tiles: { label: string; value: number; color: string }[] = [
    { label: "Present", value: agg.present, color: "var(--success)" },
    { label: "Late", value: agg.late, color: "var(--warning)" },
    { label: "Half day", value: agg.halfDay, color: "var(--accent)" },
    { label: "On leave", value: agg.onLeave, color: "var(--primary)" },
    { label: "Absent", value: agg.absent, color: "var(--destructive)" },
  ];

  return (
    <SectionCard
      title={`Team attendance · ${monthLabel(month)}`}
      description="Aggregate across all members this month"
      icon={Users}
      isLoading={isLoading}
      loadingRows={1}
      isEmpty={!isLoading && rows.length === 0}
      emptyIcon={Users}
      emptyText="No attendance recorded this month yet."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-lg border border-border/60 bg-[color-mix(in_srgb,var(--muted-foreground)_5%,transparent)] p-3"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: t.color }} />
              {t.label}
            </div>
            <div className="mt-1.5 font-display text-xl font-semibold tabular-nums">
              {t.value}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
